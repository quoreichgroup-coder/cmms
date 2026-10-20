# QPM / QUOREICH rebranding audit

Date: 20 October 2026  
Scope: repository inspection only; no application identity or behavior was changed in this audit.

## Conclusion

A staged rebrand is feasible without changing API behavior. The Web app already presents `QUOREICH GROUP · QPM`, the PWA manifest uses QUOREICH/QPM, and Android/iOS home-screen labels are `QPM`. Several repository defaults, public URLs, email/template text and monitoring identifiers still say Atlas. These can be reviewed and replaced independently from the stable application identifiers.

Do not globally replace `Atlas`. The Android application ID (`com.atlas.cmms`), iOS bundle ID (`com.cmms.atlas`), iOS target/workspace/scheme (`AtlasCMMS`), URL scheme (`atlascmms`), Expo/Gradle project identifiers and existing Play Store/App Store records are part of the installed-app identity. Changing an application ID or bundle ID creates a different installed app; existing users will not receive an in-place update, and signing, EAS updates, push notifications, deep links and store listings may no longer match. Keep them stable unless a separately planned migration explicitly accepts a parallel app and a user/data transition.

## Verified current state

| Area | Evidence | Assessment |
| --- | --- | --- |
| Web title and presentation | `frontend/public/index.html` sets `QUOREICH GROUP · QPM`; current Web UI strings in `frontend/src/i18n/translations/{en,fr}.ts` explain that QPM is maintained by QUOREICH. | Already rebranded in key entry points. Preserve the upstream notice required by the project’s AGPL-derived distribution. |
| Web/PWA logo | `frontend/public/static/images/logo/` contains `logo.png`, `logo-white.png` and `qpm-*.png`; `frontend/public/manifest.json` names the app `QUOREICH GROUP · QPM`. | QPM artwork and manifest are already used. Verify every page/login/email variant visually before removing older assets. |
| Mobile display name | `mobile/app.config.ts` declares `name: 'QPM'`; Android `strings.xml` and iOS `Info.plist` use `QPM`. | User-visible launcher label is already QPM. |
| Mobile stable identifiers | `mobile/app.config.ts`, Android Gradle/manifest and iOS project/Fastlane files contain `com.atlas.cmms`, `com.cmms.atlas`, `atlascmms`, `AtlasCMMS`; Android also recognizes legacy Expo/deep-link schemes and a legacy web host. | Compatibility-sensitive. Do not rename in a visual rebrand. Keep old links resolving; add a new scheme only as an additive migration if needed. |
| Web build metadata | `frontend/package.json` still has package name/title `atlas-cmms` / `Atlas CMMS` and the Atlas homepage; Sentry defaults include `atlas-frontend`. | Package/Sentry names are not normally customer-visible, but package-lock/workflows and monitoring dashboards must be updated in one coordinated change. Homepage is deployment metadata and must track a real domain, not a guessed QPM domain. |
| Marketing and legal URLs | `home/src/utils/metadata.ts` and `home/src/utils/serverBrand.ts` retain Atlas canonical URLs, contact address and defaults; root README links to Atlas website, docs, support and store listings. | Requires ownership of replacement domains/email and redirects before change. The current QPM mobile listing may intentionally be the existing Atlas store record. |
| Backend brand/email templates | `api/src/main/java/com/grash/utils/Consts.java`, webhook endpoint descriptions/controllers, template tests and defaults contain Atlas strings. Brand configuration is already runtime-configurable for some rendered company content. | Customer-facing copy can be rebranded, but first identify whether each string is a company default, upstream product notice, signed/payment/webhook contract, or API documentation. Test email renderings, links, licensing and webhook docs. |
| Deployment names | Compose, CI, image repositories, container names, database name `atlas`, MinIO bucket, API docs group and Sentry organization contain Atlas identifiers. | Mostly operational/internal, not a UI-only rename. Changing them can orphan existing volumes, alter project/network names, break image pulls/rollback, monitoring history or clients that call documented API-doc paths. Preserve data volumes and provide aliases/transition steps if ever migrated. |
| License and upstream attribution | Root README, `COMMERCIAL_LICENSE.MD`, `Security.md`, source notices and translations refer to Atlas/Grash upstream. | Do not rewrite upstream ownership, license terms, trademark statements, or copyright notices as part of product rebranding. QPM/QUOREICH identity can be prominent while preserving required notices and links. Legal review is needed before changing redistributed license documents. |
| README mobile screenshots | Root `README.MD` embeds one repository screenshot and two remote image-host screenshots; `images/mobile/Home.png` is a dated design-reference image, not verified as a capture of the current installed app. | Replace only with screenshots captured from a verified current build. No Android device/emulator is connected in this environment (`adb` unavailable), and local Chromium cannot launch due Snap confinement; therefore no new app screenshots were generated or substituted. |

## Safe rebrand boundaries

**Low risk after visual review:** app title/description, user-facing product copy, supported logo/launcher artwork, login/onboarding wording, About screen and customer-facing documentation that the project owns. Keep AGPL and upstream attribution available.

**Needs coordinated config and validation:** company default name/contact/site, email templates, public website canonical URLs, support links, package metadata, Sentry project/release names, deployment image tags, API-doc titles, deep-link domain and QR print branding. These depend on actual domains, credential owners and customer integration contracts. Retain redirects and old link acceptance where possible.

**Preserve for continuity:** Android `applicationId`, iOS `bundleIdentifier`, signing identities, Play/App Store records, EAS project/runtime/update identifiers, database/schema/volume names, API routes and DTOs, JWT issuer/audience, OAuth callback registrations, webhook event/signature contracts, existing deep-link schemes, and customer tenant branding settings. Renaming these is a product migration, not a cosmetic rebrand.

## Recommended implementation sequence

1. Inventory all customer-visible Atlas occurrences by surface and confirm the canonical brand text, logo, website, support email and store listings owned by QUOREICH.
2. Rebrand owned UI copy, default metadata and help links while preserving legal attribution and all installed-app/API identifiers.
3. Update email templates and all supported locales; run rendering/snapshot tests and verify invite, password reset, license and notification URLs.
4. Update owned marketing/docs URLs only after DNS, TLS, email delivery, redirects and analytics are ready. Preserve old host redirects and OAuth/deep-link callbacks.
5. Decide separately whether Docker/container/database/monitoring names need migration. If so, use aliases/parallel tags, retain named volumes, test rollback and do not recreate production state.
6. Capture new Web and native screenshots from the deployed candidate/current device build; include device size, OS, build/version and whether data is live or anonymized.
7. Run Android update/signature checks, iOS profile/EAS checks, deep-link tests, QR link resolution, OAuth callbacks, push notification tests, API compatibility tests, license flows, and full Web/mobile build/regression suites before release.

## Remaining decisions and blockers

- Confirm the canonical QUOREICH public hostname and support email; current references point to Atlas domains.
- Confirm whether existing App Store / Play listings are owned and intended to remain the QPM distribution channel.
- Decide whether historical database/container/image/monitoring identifiers need to remain Atlas for operations and rollback.
- Capture current native application screenshots using a connected Android/iOS device or a working emulator. The local `images/mobile/Home.png` is not suitable evidence for the current app.
- Preserve upstream AGPL notices and obtain legal review before editing any upstream license or commercial-license text.

No API, authentication, permissions, database, signing, or deployment configuration was changed while preparing this report.

## Safe copy pass — 20 October 2026

The first low-risk visible-copy pass updates the Web package title/description and Web/API README headings to QUOREICH/QPM, changes the supplier example from Atlas to QUOREICH GROUP, and changes the webhook OpenAPI descriptions from Atlas CMMS to QPM. `frontend/scripts/rebrand-visible-copy.test.cjs` checks these labels and asserts that the Android application ID, iOS bundle ID and URL scheme remain unchanged. A second Mobile copy pass replaces Atlas product mentions in Bosnian, Polish and Hungarian feature translations with QPM; `mobile/scripts/rebrand-copy.test.cjs` protects all Mobile locale files. The Web upstream attribution notice remains intact. Internal package names, public hostnames, license/payment product names and native project identifiers remain unchanged pending owner/domain/legal decisions.
