import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const android = path.join(root, 'android');
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || path.join(root, '.build-tools/android-sdk');
const env = {
  ...process.env,
  ANDROID_HOME: sdk,
  ANDROID_SDK_ROOT: sdk,
  GRADLE_USER_HOME: process.env.GRADLE_USER_HOME || path.join(root, '.build-tools/gradle-cache'),
  NODE_ENV: process.env.NODE_ENV || 'development',
  JAVA_TOOL_OPTIONS: `${process.env.JAVA_TOOL_OPTIONS || ''} -XX:ActiveProcessorCount=2`.trim(),
  CMAKE_BUILD_PARALLEL_LEVEL: process.env.CMAKE_BUILD_PARALLEL_LEVEL || '1',
  EXPO_NO_TELEMETRY: '1'
};

const result = spawnSync('./gradlew', [
  'assembleDebug',
  '--no-daemon',
  '--max-workers=1',
  '--console=plain',
  '-Dorg.gradle.jvmargs=-Xmx1200m -XX:MaxMetaspaceSize=384m',
  `-PreactNativeArchitectures=${process.env.QPM_ANDROID_ARCHITECTURES || 'arm64-v8a'}`
], { cwd: android, env, stdio: 'inherit' });

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);

const version = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const source = path.join(android, 'app/build/outputs/apk/debug/app-debug.apk');
if (!existsSync(source)) throw new Error(`Debug APK was not produced: ${source}`);

const outputDirectory = path.join(root, 'dist');
mkdirSync(outputDirectory, { recursive: true });
const artifact = path.join(outputDirectory, `QPM-${version}-dev.apk`);
copyFileSync(source, artifact);
console.log(`Development APK: ${artifact}`);
console.log('Install this development APK once, then use "npm run start:tunnel" for live JS/UI updates.');
