import 'dotenv/config';
import { ExpoConfig, ConfigContext } from 'expo/config';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Keep the dynamic Expo config self-contained: Expo evaluates this file before
// Metro's TypeScript resolver is installed, so local TS imports can fail here.
const apiUrl = process.env.API_URL || 'https://169-58-86-7.sslip.io/api';
// Keep EAS linked to the existing QPM project even when commands are run
// without a shell-level EAS_PROJECT_ID. This is the project ID already used
// by the native Expo Updates configuration.
const easProjectId =
  process.env.EAS_PROJECT_ID || 'fbfaa721-adb1-463a-8757-3e256cf7337a';
const clarityId = process.env.CLARITY_ID;
const googleServicesPlist = process.env.GOOGLE_SERVICES_PLIST;
const sentryDsn = process.env.SENTRY_DSN;
const sentryEnvironment = process.env.SENTRY_ENVIRONMENT || 'production';
let gitHash = 'local';
try {
  gitHash =
    execSync('git rev-parse --short HEAD', { stdio: 'ignore' })
      .toString()
      .trim() || 'local';
} catch {
  // Expo can still start from source archives, read-only workspaces or Docker
  // mounts where Git metadata is unavailable.
}
const sentryRelease = process.env.SENTRY_RELEASE || gitHash;

const androidGoogleServicesPath = path.resolve(
  __dirname,
  'android/app/google-services.json'
);
if (process.env.GOOGLE_SERVICES_BASE64) {
  fs.writeFileSync(
    androidGoogleServicesPath,
    Buffer.from(process.env.GOOGLE_SERVICES_BASE64, 'base64').toString('utf-8')
  );
}

const plugins: ExpoConfig['plugins'] = [
  'react-native-nfc-manager',
  'expo-font',
  'expo-notifications',
  '@react-native-community/datetimepicker',
  './plugins/ios/withFmtXcode26Fix',
  [
    'expo-camera',
    {
      cameraPermission: 'Allow QPM to access camera.'
    }
  ],
  [
    'expo-build-properties',
    {
      ios: {
        useFrameworks: 'static',
        deploymentTarget: '15.1'
      },
      android: {
        compileSdkVersion: 36,
        targetSdkVersion: 36
      }
    }
  ]
];

if (process.env.SENTRY_AUTH_TOKEN) {
  plugins.push([
    '@sentry/react-native/expo',
    {
      url: 'https://sentry.io/',
      organization: process.env.SENTRY_ORG,
      project: 'mobile',
      authToken: process.env.SENTRY_AUTH_TOKEN
    }
  ]);
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'QPM',
  slug: 'qpm',
  version: '1.0.59',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'atlascmms',
  userInterfaceStyle: 'automatic',
  newArchEnabled: false,
  notification: {
    icon: './assets/images/notification.png'
  },
  splash: {
    image: './assets/images/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
    dark: {
      image: './assets/images/splash-dark.png',
      backgroundColor: '#0D1220'
    }
  },
  updates: {
    fallbackToCacheTimeout: 0,
    enabled: Boolean(easProjectId),
    ...(easProjectId ? { url: `https://u.expo.dev/${easProjectId}` } : {}),
    assetPatternsToBeBundled: ['**/*']
  },
  ios: {
    bundleIdentifier: 'com.cmms.atlas',
    buildNumber: '13',
    jsEngine: 'hermes',
    supportsTablet: false,
    // Bare React Native workflow requires a concrete runtime version for EAS Update.
    runtimeVersion: '1.0.59',
    ...(googleServicesPlist && fs.existsSync(googleServicesPlist)
      ? { googleServicesFile: googleServicesPlist }
      : {}),
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#071b3d'
    },
    versionCode: 42,
    package: 'com.atlas.cmms',
    jsEngine: 'hermes',
    edgeToEdgeEnabled: true,
    ...(fs.existsSync(androidGoogleServicesPath)
      ? { googleServicesFile: androidGoogleServicesPath }
      : {}),
    runtimeVersion: '1.0.59'
  },
  web: {
    favicon: './assets/images/favicon.png'
  },
  extra: {
    API_URL: apiUrl,
    CLARITY_ID: clarityId,
    SENTRY_DSN: sentryDsn,
    SENTRY_ENVIRONMENT: sentryEnvironment,
    SENTRY_RELEASE: sentryRelease,
    ...(easProjectId ? { eas: { projectId: easProjectId } } : {})
  },
  plugins
});
