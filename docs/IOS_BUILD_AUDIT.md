# QPM iOS build pipeline — repository audit

**Audit date:** 2026-10-19
**Scope:** source configuration inspection from the Linux development environment. No Xcode build, CocoaPods resolution, signing, or device installation was possible here.

## Verified repository facts

| Area | Finding | Evidence |
|---|---|---|
| Mobile framework | Expo SDK `~53.0.27` with React Native `0.79.6`; this is an Expo prebuild/bare native project, not a plain React Native CLI project. | `mobile/package.json`, `mobile/app.config.ts` |
| JavaScript package manager | npm; committed lockfile is `mobile/package-lock.json`. Node `22.22.1` and npm `9.2.0` are available in the current Linux environment; no Node engine is declared by the project. | `mobile/package.json`, current shell |
| iOS native project | Committed `mobile/ios/AtlasCMMS.xcodeproj`, `AtlasCMMS.xcworkspace`, and `Podfile`. The shared scheme is `AtlasCMMS`; archive action uses Release. | `mobile/ios/AtlasCMMS.xcscheme`, workspace, Podfile |
| iOS identifiers | Bundle ID `com.cmms.atlas`; display name QPM; marketing version `1.0.59`; build number `13`; development team in project settings `KXW8RH26AN`. | `app.config.ts`, `Info.plist`, `project.pbxproj` |
| Deployment target | iOS `15.1`, static frameworks, Hermes, New Architecture disabled. | `Podfile.properties.json`, `Podfile`, app config |
| CocoaPods | `Podfile.lock` is tracked and was generated with CocoaPods `1.16.2`. | `mobile/ios/Podfile.lock` |
| Existing iOS CI | No dedicated iOS GitHub Actions workflow, Fastlane setup, Matchfile, or Jenkinsfile was found. Existing workflows handle Docker deployment and EAS Update. | `.github/workflows/` |
| EAS | `mobile/eas.json` already defines development, preview, production and Android APK profiles; production uses remote app-version source and auto-increment. EAS is an existing alternative, separate from the requested GitHub-hosted/Jenkins pipelines. | `mobile/eas.json`, `mobile/README.md` |
| Camera | `expo-camera` is present in package and Pod lock; `NSCameraUsageDescription` exists. The scanner uses Expo Camera. | `package.json`, `Podfile.lock`, `Info.plist`, `SelectBarcodeModal.tsx` |
| NFC | The app now enables iOS autolinking for `react-native-nfc-manager`; `Info.plist` contains `NFCReaderUsageDescription`, and the target references an entitlements file with the Core NFC TAG format. CocoaPods lock resolution, signing profile capability and hardware behavior are still unverified. | `react-native.config.js`, package Podspec, `Podfile.lock`, `Info.plist`, entitlements |
| Notifications/Firebase | Firebase App and Analytics pods are present. `aps-environment` is hard-coded to `development` in the checked-in entitlements, so Ad Hoc push signing needs a Release entitlement with `production` (or an equivalent build-time override). Firebase service configuration is optional in `app.config.ts`; push delivery additionally needs valid APNs/Firebase credentials. | package, Pod lock, entitlements, app config |
| Network security | ATS disallows arbitrary loads; local networking is allowed. The app config defaults to an HTTPS QPM API URL and permits `API_URL` override. | `Info.plist`, `app.config.ts` |
| Secrets | Repository ignore rules exclude `.env`, local Xcode environment overrides and IPA outputs. No signing assets should be added to the repository. | `.gitignore`, `mobile/ios/.gitignore` |
| Current build host | Linux; Xcode, Ruby, Bundler, Fastlane and CocoaPods are not installed. | `uname`, command availability |

## Implications and blockers

1. An unsigned Xcode archive can be built on a macOS runner without Apple distribution credentials, but it is **not an installable iPhone IPA**.
2. Ad Hoc IPA generation requires an Apple Developer Program team, an Apple Distribution certificate, an Ad Hoc provisioning profile containing the target iPhone UDID, and enabled NFC capability if NFC is required. None of the private signing material is present in this checkout.
3. iOS NFC source support is enabled, but its native build is not yet verified. Regenerate `Podfile.lock` on macOS/Xcode, build/sign with a provisioning profile carrying the Core NFC capability, and verify on compatible hardware. A JavaScript export cannot verify native linking.
4. For Ad Hoc Release, the current development APNs entitlement must be replaced at signing/build time with the production APNs entitlement while retaining Core NFC. The lane may do this in a generated, untracked artifact file; the checked-in Debug entitlement should not be mutated by CI.
5. Jenkins on Linux cannot compile iOS. The Jenkins controller can stay on the VPS, but a separate macOS agent with Xcode is mandatory. That agent is real Apple hardware or a lawful macOS cloud VM and remains a cost item.
6. The current repository contains unrelated uncommitted work. Pipeline implementation must leave it untouched and add only the requested CI, Fastlane and documentation files.

## Validation boundary

The scheme, workspace, project settings, dependency manifests, entitlement declarations and workflow inventory were inspected directly. This report does not claim an Xcode compilation, Pod installation, signed archive, IPA, App Store/TestFlight upload, or physical iPhone test.

## EAS build check — 19 October 2026

- The existing EAS project is `@qrchs-team/qpm` (`fbfaa721-adb1-463a-8757-3e256cf7337a`), matching the Expo Updates URL in the native Android manifest. `mobile/app.config.ts` now defaults to this ID so `eas` commands do not prompt to create or link another project. A separate `@qrch/qpm` project was accidentally created during an interactive `build:list` attempt; it is not the QPM project used by the native app and was not deleted.
- The monorepo root `.easignore` is the file EAS reads. It now excludes `mobile/.build-tools`, local Expo export/check bundles, Android build outputs, and iOS Pods. This avoids uploading multi-gigabyte development caches.
- Both platforms now use explicit runtime version `1.0.59`, required by EAS for this bare/native workflow. Expo config validation reports the existing slug `qpm`, app version `1.0.59`, correct EAS project ID, and matching iOS/Android runtime versions.
- EAS accepted the 109 MB source archive and created Android production build `25932e7a-15b2-460c-ae96-1c83acad7d41` (version code 47); its last observed status was `in queue`. No Android artifact has been produced yet.
- The iOS production attempt stopped before job creation because remote iOS signing credentials are not configured (`Credentials are not set up`). EAS advanced the remote iOS build number from 13 to 14 before stopping. An Apple Developer team, distribution certificate/provisioning profile, and App Store Connect submission credentials must be configured before a signed, auto-submitted iOS build can complete.
- The command used `--auto-submit`; automatic store submission remains unverified and can only happen after a successful build with valid store credentials. No IPA or store submission is claimed.

## Correction de pipeline — 20 octobre 2026

La revue de la configuration a trouvé un mauvais répertoire de lancement : le Fastfile est dans `mobile/ios/fastlane`, tandis que GitHub Actions et Jenkins invoquaient les lanes depuis `mobile/`. Les deux pipelines utilisent maintenant `mobile/ios/`, en conservant `BUNDLE_GEMFILE=mobile/Gemfile`. Une régression statique vérifie ce contrat. Aucun macOS/Xcode n’étant disponible sur ce poste, l’exécution réelle des lanes reste non vérifiée.
