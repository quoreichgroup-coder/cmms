// Learn more https://docs.expo.io/guides/customizing-metro
// const { getDefaultConfig } = require('expo/metro-config');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);
// Keep release bundling reliable on CI and smaller build machines.
config.maxWorkers = Number(process.env.EXPO_METRO_MAX_WORKERS || 2);

config.transformer.unstable_transformProfile = 'hermes-stable';

module.exports = config;
