// Learn more https://docs.expo.io/guides/customizing-metro
// const { getDefaultConfig } = require('expo/metro-config');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const path = require('path');

const config = getSentryExpoConfig(__dirname);
// Keep release bundling reliable on CI and smaller build machines.
config.maxWorkers = Number(process.env.EXPO_METRO_MAX_WORKERS || 2);

// The local Android toolchain cache lives inside mobile/.build-tools. Metro
// must not watch its many SDK and Gradle cache files (which can exhaust OS
// filesystem watcher limits and stop Expo during startup).
const buildToolsPath = path
  .join(__dirname, '.build-tools')
  .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const buildToolsBlock = new RegExp(`^${buildToolsPath}[/\\\\].*`);
// Previous validation bundles can contain hundreds of generated assets. Keep
// local .expo-check-* and .expo-export-* outputs out of Metro's project scan.
const localExpoArtifactsPath = path
  .join(__dirname, '.expo-')
  .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const localExpoArtifactsBlock = new RegExp(
  `^${localExpoArtifactsPath}(?:check|export)-[^/\\\\]+(?:[/\\\\].*)?$`
);
const nativeBuildOutputBlock = new RegExp(
  `${path
    .join(__dirname, 'node_modules')
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    )}[/\\\\].*[/\\\\](?:android|ios)[/\\\\](?:build|\\.cxx)[/\\\\].*`
);
// Expo config plugins produce Kotlin/Gradle output under paths such as
// expo-dev-launcher-gradle-plugin/build/classes. These files are not Metro
// inputs and can exhaust Linux inotify watchers during development.
const gradlePluginBuildOutputBlock =
  /node_modules[/\\].*[/\\][^/\\]*gradle-plugin[/\\]build[/\\].*/;
const existingBlockList = config.resolver.blockList;
config.resolver.blockList = existingBlockList
  ? Array.isArray(existingBlockList)
    ? [
        ...existingBlockList,
        buildToolsBlock,
        localExpoArtifactsBlock,
        nativeBuildOutputBlock,
        gradlePluginBuildOutputBlock
      ]
    : [
        existingBlockList,
        buildToolsBlock,
        localExpoArtifactsBlock,
        nativeBuildOutputBlock,
        gradlePluginBuildOutputBlock
      ]
  : [
      buildToolsBlock,
      localExpoArtifactsBlock,
      nativeBuildOutputBlock,
      gradlePluginBuildOutputBlock
    ];

config.transformer.unstable_transformProfile = 'hermes-stable';

module.exports = config;
