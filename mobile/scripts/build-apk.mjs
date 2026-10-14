import { randomBytes } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  chmodSync,
  copyFileSync,
  rmSync
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sdk =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  path.join(root, '.build-tools/android-sdk');
const signing = path.join(root, '.build-tools/signing');
mkdirSync(signing, { recursive: true, mode: 0o700 });
const credentialsPath = path.join(signing, 'credentials.json');
const keystore = path.join(signing, 'qpm-release.jks');
if (existsSync(keystore) && !existsSync(credentialsPath))
  throw new Error(
    'Signing credentials missing: restore them before rebuilding.'
  );
const credentials = existsSync(credentialsPath)
  ? JSON.parse(readFileSync(credentialsPath, 'utf8'))
  : { password: randomBytes(32).toString('hex'), alias: 'qpm-release' };
const env = {
  ...process.env,
  ANDROID_HOME: sdk,
  GRADLE_USER_HOME:
    process.env.GRADLE_USER_HOME ||
    path.join(root, '.build-tools/gradle-cache'),
  QPM_KEYSTORE_PATH: keystore,
  QPM_KEYSTORE_PASSWORD: credentials.password,
  QPM_KEY_PASSWORD: credentials.password,
  QPM_KEY_ALIAS: credentials.alias,
  NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=1800',
  EXPO_NO_TELEMETRY: '1',
  SENTRY_DISABLE_AUTO_UPLOAD: 'true'
};
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { env, cwd, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
if (!existsSync(keystore)) {
  writeFileSync(credentialsPath, JSON.stringify(credentials), { mode: 0o600 });
  run(
    process.env.JAVA_HOME
      ? path.join(process.env.JAVA_HOME, 'bin/keytool')
      : 'keytool',
    [
      '-genkeypair',
      '-keystore',
      keystore,
      '-storetype',
      'JKS',
      '-alias',
      credentials.alias,
      '-storepass:env',
      'QPM_KEYSTORE_PASSWORD',
      '-keypass:env',
      'QPM_KEY_PASSWORD',
      '-keyalg',
      'RSA',
      '-keysize',
      '3072',
      '-validity',
      '10000',
      '-dname',
      'CN=QPM, O=QUOREICH'
    ]
  );
  chmodSync(keystore, 0o600);
}
writeFileSync(path.join(root, 'android/local.properties'), `sdk.dir=${sdk}\n`);

// Bundle Hermes before Gradle starts. Running Metro beside the Gradle daemon
// can exceed the memory budget on the Linux build host and kill the daemon.
const generatedAssets = path.join(
  root,
  'android/app/build/generated/assets/createBundleReleaseJsAndAssets'
);
const generatedResources = path.join(
  root,
  'android/app/build/generated/res/createBundleReleaseJsAndAssets'
);
const bundleOutput = path.join(generatedAssets, 'index.android.bundle');
const expoCli = path.join(root, 'node_modules/@expo/cli/build/bin/cli');
if (!existsSync(expoCli)) throw new Error(`Expo CLI not found: ${expoCli}`);
rmSync(generatedAssets, { recursive: true, force: true });
rmSync(generatedResources, { recursive: true, force: true });
mkdirSync(generatedAssets, { recursive: true });
mkdirSync(generatedResources, { recursive: true });
console.log(
  'Bundling Android JavaScript and assets before Gradle to limit peak memory.'
);
const bundleArgs = [
  expoCli,
  'export:embed',
  '--platform',
  'android',
  '--entry-file',
  'index.js',
  '--dev',
  'false',
  '--minify',
  'true',
  '--bundle-output',
  bundleOutput,
  '--assets-dest',
  generatedResources,
  '--max-workers',
  String(process.env.EXPO_METRO_MAX_WORKERS || 1),
  '--unstable-transform-profile',
  'hermes-stable'
];
if (
  !/^\s*hermesEnabled\s*=\s*false\s*$/im.test(
    readFileSync(path.join(root, 'android/gradle.properties'), 'utf8')
  )
) {
  bundleArgs.push('--bytecode');
}
run(process.execPath, bundleArgs);
if (!existsSync(bundleOutput))
  throw new Error(`Expo did not produce the Android bundle: ${bundleOutput}`);

run(
  './gradlew',
  [
    'assembleRelease',
    '--no-daemon',
    '--max-workers=1',
    '-Pqpm.prebundledBundle=true',
    '-Pkotlin.compiler.execution.strategy=in-process',
    `-PreactNativeArchitectures=${
      process.env.QPM_ANDROID_ARCHITECTURES || 'armeabi-v7a,arm64-v8a'
    }`
  ],
  path.join(root, 'android')
);
const version = JSON.parse(
  readFileSync(path.join(root, 'package.json'), 'utf8')
).version;
mkdirSync(path.join(root, 'dist'), { recursive: true });
const artifact = path.join(root, `dist/QPM-${version}.apk`);
copyFileSync(
  path.join(root, 'android/app/build/outputs/apk/release/app-release.apk'),
  artifact
);
console.log(`APK: ${artifact}`);
console.log('Keep .build-tools/signing securely backed up for future updates.');
