# QPM — iOS build setup without a local Mac

**Status (20 octobre 2026):** Android APK `1.0.59` was rebuilt and signature-verified locally. This host is Linux, so it cannot run Xcode or produce an iOS archive/IPA. The repository has a manual GitHub Actions workflow on a macOS 26 runner: `verify` can validate an unsigned archive without Apple signing, while `adhoc` needs the configured private Match repository and signing secrets. No iOS workflow execution or IPA is confirmed by this local session; prior EAS signing was blocked because credentials were not configured.

This setup reuses the checked-in Expo prebuild/Xcode project. It does not migrate QPM to Expo managed builds and does not run `expo prebuild` during CI. Both build systems call the same Fastlane lanes from `mobile/ios/fastlane/Fastfile`.

## Architecture

```text
GitHub Actions (macOS 26) ─┐
                           ├─ npm ci → Bundler/CocoaPods → Fastlane
Jenkins Linux controller ──┘                         │
                                      remote macOS + Xcode agent
                                                     ├─ verify: unsigned .xcarchive
                                                     └─ adhoc: signed .ipa (Apple credentials)
```

The Linux Jenkins controller can orchestrate jobs, but it cannot compile iOS. Jenkins must dispatch the job to a dedicated macOS agent. The same is true of any Linux VPS: installing Xcode tooling there is not a substitute for macOS.

## Repository values verified by the audit

| Setting | Value |
|---|---|
| Mobile root | `mobile/` |
| Workspace / project | `mobile/ios/AtlasCMMS.xcworkspace` / `AtlasCMMS.xcodeproj` |
| Shared scheme | `AtlasCMMS` |
| Bundle identifier | `com.cmms.atlas` |
| iOS deployment target | 15.1 |
| React Native / Expo | 0.79.6 / SDK 53 |
| JavaScript dependencies | npm with `mobile/package-lock.json` |
| Current Apple team ID in Xcode project | `KXW8RH26AN` |
| Output | `mobile/artifacts/ios/` |

These values are centralized as workflow/lane defaults and can be overridden with environment variables where appropriate. Review `docs/IOS_BUILD_AUDIT.md` before changing the native project.

## Build modes

### Unsigned verification

Choose `verify` in the GitHub Actions manual run or Jenkins `BUILD_MODE` parameter. It installs dependencies, runs CocoaPods, resolves Swift packages and archives the Release configuration with code signing disabled. The resulting `.xcarchive.zip` and build log validate compilation only. **An unsigned archive is not an installable iPhone application and is not an IPA.** No Apple Developer signing credentials are needed.

### Signed Ad Hoc IPA

Choose `adhoc` only after Apple signing is configured. Fastlane Match runs read-only, then Xcode exports an Ad Hoc IPA. The lane checks for the IPA before reporting success. It generates an untracked Release entitlements file with production APNs while retaining the existing Core NFC entitlement; the checked-in development entitlement is not modified.

An Ad Hoc profile must include the target iPhone UDID and all required app capabilities. Adding a device later requires updating the Apple device list/profile and rebuilding/re-signing.

## GitHub Actions setup

1. Keep `.github/workflows/ios-build.yml`; it is intentionally a separate workflow from Docker deployment and EAS Update workflows.
2. In GitHub, open **Actions → QPM iOS build → Run workflow** and select `verify` first.
3. Download the artifact named `qpm-ios-<mode>-<run number>`. It contains the archive (for `verify`), logs and resolved dependency lock snapshots when produced.
4. Review and commit the generated `mobile/ios/Podfile.lock` if CocoaPods adds the missing NFC native pod. Review and commit `mobile/Gemfile.lock` from the resolved artifact before relying on repeatable dependency resolution. The current checkout lacks that Ruby lockfile, and the Linux authoring environment has no Ruby/Bundler/CocoaPods to generate it.
5. For signed builds, configure the repository secrets below, then run `adhoc`.

The workflow uses a GitHub-hosted `macos-26` runner, Node 22 and Ruby 3.3, with a 90-minute timeout. It asks only for `contents: read`; artifacts are retained for 14 days. GitHub runner images and labels change over time, so confirm the selected Xcode version in the run log if GitHub retires that image.

### GitHub secrets for Ad Hoc signing

| Secret | Purpose |
|---|---|
| `IOS_MATCH_GIT_URL` | Private repository containing encrypted Match signing assets |
| `IOS_MATCH_GIT_BASIC_AUTHORIZATION` | Base64-encoded Git basic-auth value for that private repository, if HTTPS auth is used |
| `IOS_MATCH_PASSWORD` | Encryption password for Match certificates/profiles |

Do not put certificates, `.p12`, provisioning profiles, Match passwords, Apple account passwords, API tokens or `.env` files in Git. Restrict access to the signing repository and GitHub environment/secrets. The workflow runs Match with `readonly: true`; it cannot create or mutate signing assets.

## Fastlane Match bootstrap

Match assets must be provisioned once by an Apple Developer account holder on an authorized macOS environment. The CI lane is deliberately read-only. Create the private signing repository, configure the App ID `com.cmms.atlas` with the required Push Notifications and NFC capabilities, register each target iPhone UDID, and generate an Ad Hoc profile/certificate with Fastlane Match. Store the encrypted Match repository separately from this application repository.

The repository includes a `Matchfile` template with a placeholder Git URL. Supply the actual private URL through `MATCH_GIT_URL`; do not edit the template to include a credential. The Apple Team ID is read from the audited project (`KXW8RH26AN`) and can be provided as `APPLE_TEAM_ID` if the project ownership changes.

## Jenkins setup

1. Run Jenkins on the existing Linux VPS only as a controller. Do not run untrusted build scripts on the controller or expose inbound agent/Remoting ports directly to the public Internet.
2. Attach a separate, secured macOS machine/VM with Xcode 26, command-line tools, Node 22, Ruby 3.3, JavaScript/npm access and sufficient disk space. Label it `macos` and `xcode`; the Jenkinsfile requires both labels.
3. Prefer an outbound/SSH agent connection through a restricted network path, run the agent under a dedicated unprivileged account, keep Xcode licensed, and isolate/clean workspaces. Permit access only to the required GitHub and package endpoints.
4. Create Jenkins secret-text credentials with IDs `qpm-ios-match-git-url`, `qpm-ios-match-git-basic-authorization`, and `qpm-ios-match-password`. Configure credentials only for trusted release jobs. Do not echo credentials or enable shell tracing around them.
5. Create a Pipeline job from SCM pointing at `Jenkinsfile`; select `verify` first. The pipeline archives IPA/archive/log artifacts and cleans the workspace afterward.
6. `adhoc` uses the same Fastlane lane and Match assets as GitHub Actions. Do not allow forked/untrusted pull requests to access signing credentials.

If no eligible Mac agent is online, the job remains queued; that is a provisioning blocker, not an iOS compilation result.

## Apple signing and physical iPhone installation

For the existing EAS production profile, first configure signing interactively from `mobile/`:

```bash
EAS_PROJECT_ID=fbfaa721-adb1-463a-8757-3e256cf7337a npx eas-cli@latest credentials --platform ios --profile production
```

Sign in to the Apple Developer team that owns `com.cmms.atlas` and follow EAS prompts to create or select the Apple Distribution certificate and provisioning profile. Do not paste Apple passwords, private keys, or App Store Connect API keys into chat or commit them. After credentials are ready, run an iOS-only build to avoid duplicating the Android job already queued:

```bash
EAS_PROJECT_ID=fbfaa721-adb1-463a-8757-3e256cf7337a npx eas-cli@latest build --platform ios --profile production --auto-submit
```

EAS must also have valid App Store Connect credentials for the `--auto-submit` step. If they are not configured, omit `--auto-submit` and retrieve the signed IPA from the EAS build page instead.

An installable Ad Hoc IPA requires:

- An active Apple Developer Program team. Apple currently lists membership at USD 99 per year (regional pricing may differ).
- The explicit bundle ID `com.cmms.atlas` and capabilities used by QPM.
- An Apple Distribution certificate and a matching Ad Hoc provisioning profile.
- The physical iPhone's UDID registered with the team and included in that profile. Apple limits Ad Hoc registrations to 100 devices per product family per membership year.
- A successful signed export from the `adhoc` lane.

An IPA downloaded to an iPhone is not installed by tapping the file in the browser. Distribute it through an approved mechanism: an MDM, Apple Configurator, or a properly hosted Ad Hoc OTA installation page/manifest over HTTPS (`itms-services`) whose profile includes that device. TestFlight is another route but requires App Store Connect setup and is not the Ad Hoc lane implemented here.

The signed lane does not upload to App Store Connect or deploy the app. Artifact publication means upload to the workflow/Jenkins artifact store only.

## Retrieve artifacts

- **GitHub Actions:** open the completed workflow run and download its artifact before its 14-day retention expires.
- **Jenkins:** open the build page and download the archived artifact.
- Expected signed file: `mobile/artifacts/ios/QPM-1.0.59-adhoc.ipa` (version read from `mobile/package.json`).
- Expected verification output: `QPM-1.0.59-verify.xcarchive.zip`, which cannot be installed.

Confirm the artifact name, build number, bundle ID and provisioning profile before distribution. The current native build number is `13`; this pipeline does not increment versions automatically.

## Cost and practical choice

| Option | Software | Infrastructure cost |
|---|---|---|
| GitHub Actions | GitHub workflow and Fastlane are free/open-source configuration/tools | Public repositories receive standard hosted-runner use without charge under GitHub's current policy; private repositories consume plan minutes and then current macOS usage rates. Current documented macOS 3/4-core rate is USD 0.062 per minute, subject to plan/region and policy changes. |
| Jenkins | Jenkins and Fastlane are free/open-source | A real Mac or lawful macOS cloud host is still required. Hardware/cloud, maintenance, storage and network costs are additional; the Linux controller does not remove them. |
| Apple signing | Fastlane Match is open source | Apple Developer Program membership is a separate annual fee for Ad Hoc distribution. |

Lowest-cost starting point: use GitHub-hosted macOS for occasional `verify` builds, and add Ad Hoc signing only when an Apple Developer team and registered test devices are ready. Jenkins is useful when a macOS agent already exists or centralized self-hosted CI is needed; it is not inherently cheaper.

## Troubleshooting

| Symptom | Likely cause / action |
|---|---|
| Workflow cannot find `AtlasCMMS.xcworkspace` or scheme | Check out the correct branch and verify the committed iOS project/scheme paths. Do not run prebuild to mask missing tracked files. |
| Xcode version check fails | Select an available GitHub macOS image or update the secured Mac agent and its toolchain deliberately; validate the project against that Xcode before changing the guard. |
| `pod install` changes or cannot resolve the NFC pod | Review package autolinking and generated `Podfile.lock`; commit the reviewed lockfile update from a macOS run. Do not suppress the missing native module. |
| Bundler lockfile absent | Download `Gemfile.lock.resolved` from the workflow artifact, review it, add it as `mobile/Gemfile.lock`, and configure the next run to use the committed lock. |
| `match` cannot clone signing repository | Verify private repo URL and read access; for HTTPS ensure `IOS_MATCH_GIT_BASIC_AUTHORIZATION` is correctly base64-encoded. Never print its value. |
| Match decryption fails | Verify `IOS_MATCH_PASSWORD` and the encrypted repository revision. Do not regenerate/overwrite production certificates casually. |
| No matching provisioning profile / entitlement error | Confirm App ID capabilities, registered device UDID, profile type `adhoc`, bundle ID, distribution certificate and production APNs entitlement. Regenerate profile via controlled Match maintenance, then rerun CI. |
| NFC works in simulator but not device | Core NFC requires supported physical hardware, the capability/profile entitlement and iOS permissions. Device tests are mandatory; unsigned archive compilation does not prove NFC runtime behavior. |
| Push notifications fail after signed build | Confirm production APNs credentials/capability and Firebase iOS configuration. This pipeline does not provision Firebase/APNs service credentials. |
| Jenkins stays queued | Confirm the remote Mac agent is online with labels `macos` and `xcode`; Linux cannot fulfill the label. |

## Validation status and current blockers

The repository audit and pipeline structure are documented, but no Xcode/CocoaPods/Ruby toolchain is installed on this Linux host. Therefore no actual Pod resolution, unsigned archive, signed IPA, iPhone installation, NFC device test, or Apple credential validation has occurred. Two repeatability items remain for the first macOS run: resolve and review the missing NFC pod in `Podfile.lock`, and generate/review/commit `mobile/Gemfile.lock`. The `verify` workflow is the next safe validation step; `adhoc` remains optional until signing assets are configured.

## References

- [GitHub-hosted runner images](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)
- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [Fastlane Match](https://docs.fastlane.tools/actions/match/)
- [Apple Developer Program](https://developer.apple.com/programs/)
- [Apple device registration](https://developer.apple.com/help/account/devices/devices-overview/)
- [Apple Ad Hoc distribution](https://developer.apple.com/documentation/xcode/distributing-your-app-to-registered-devices)

## Correction de découverte Fastlane — 20 octobre 2026

Le `Fastfile` partagé vit dans `mobile/ios/fastlane/Fastfile`; les deux lanes CI sont donc lancées depuis `mobile/ios/` (et non `mobile/`). La dépendance Bundler reste explicitement pointée sur `mobile/Gemfile`. Le test structurel `mobile/scripts/ios-build-pipeline.test.cjs` vérifie les working directories et les deux appels GitHub Actions/Jenkins. Ce contrôle valide la structure des fichiers uniquement; il ne remplace pas un lancement Fastlane sur macOS.
