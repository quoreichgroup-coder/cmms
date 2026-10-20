# QPM Equipment 360 — Codebase audit

**Audit date:** 2026-10-13
**Scope:** existing repository implementation; no live production access or Android device was available during the code inspection. Repository files and tests are evidence of implementation, not proof of live-server/device behavior.

## Architecture found

- **Backend:** Spring Boot / Java, JPA entities and repositories, Liquibase changelogs. Asset APIs and access rules are primarily in `api/src/main/java/com/grash/controller/AssetController.java`, `.../service/AssetService.java`, `.../model/Asset.java`, `.../repository/AssetRepository.java`, and `.../mapper/AssetMapper.java`.
- **Web:** React + TypeScript + Material UI, Redux slices and shared API client. Asset pages live in `frontend/src/content/own/Assets`; the details composition includes Overview, Work Orders, Maintenance, Downtime, Requests, Meters, Children, Parts and Files components.
- **Mobile:** Expo / React Native, React Native Paper, React Navigation and Redux Toolkit. The core screens are `mobile/screens/AssetsScreen.tsx`, `CreateAssetScreen.tsx`, `EditAssetScreen.tsx`, `details/index.tsx`, `ScanAssetScreen.tsx`, and the NFC/barcode modal screens. `mobile/app.config.ts` includes `react-native-nfc-manager` and `expo-camera` plugins.
- **Persistence and relationships:** `Asset` holds tenant/company audit fields, site and functional-location links, parent asset, category, status, NFC ID, barcode, assigned users/teams, parts, files and custom fields. Relevant schema changes are in `api/src/main/resources/db/changelog/`, including asset columns, the historical barcode/NFC uniqueness change, barcode deduplication and asset indexes.
- **Authentication and scope:** scan lookup methods use the signed-in user's company; asset visibility is governed by `Asset.canBeViewedBy`. Licenses gate NFC/barcode lookup. The asset detail endpoint now also performs a company-scoped lookup before evaluating role visibility.
- **Design:** `docs/design.md` defines Equipment 360 as a lifecycle workspace. Existing mobile theme primitives are in `mobile/custom-theme.ts`, `mobile/theme/`, and `mobile/components/Themed.tsx`.

## Existing screen composition

Web already has a broad asset 360-style page. `frontend/src/content/own/Assets/Show/AssetOverview.tsx` composes work-order, PM, downtime, request, meter, children, parts and document summaries. Separate detail components provide those domains. Web `AssetDetails.tsx` renders an SVG QR code from the equipment barcode and downloads it as an image.

Mobile detail initially exposed **Details, Work Orders, Files and Parts**. This continuation adds a **Maintenance** tab in `mobile/screens/assets/details/index.tsx`, backed by `mobile/screens/assets/details/AssetMaintenance.tsx`. It displays related meters and existing last/next reading dates, all pages of enabled PM plans for that asset, and up to ten recent downtime records. Meter/PM rows open existing detail screens; loading, empty, error/retry, access and entitlement states are represented. This does not claim a timeline, inspections, condition trends, MTBF/MTTR or reliability KPIs.

## Equipment scan path traced

1. The Home screen opens `ScanAssetScreen` when the user has asset-view permission and the device reports internet connectivity.
2. `ScanAssetScreen` offers NFC on Android/iOS and QR/barcode on supported platforms, gated by the `NFC_BARCODE` entitlement. iOS autolinking is enabled in source; signed native linking/device behavior still needs Xcode validation.
3. `SelectNfcModal` starts `react-native-nfc-manager`, requests platform-specific tag technologies (Android NDEF/A/B/F/V and related technologies; iOS MIFARE/ISO 15693), reads a tag, then returns `tag.id` (the hardware identifier, not an NDEF payload).
4. `SelectBarcodeModal` requests camera permission through `ensureScannerCameraPermission`, receives Expo Camera's scanned `data`, and returns it once per modal instance.
5. `mobile/slices/asset.ts` calls `GET /assets/nfc?nfcId=...` or `GET /assets/barcode?data=...`; the identifier is now URL-encoded.
6. The backend requires the NFC/barcode entitlement, finds the identifier within the user's company and checks `Asset.canBeViewedBy`. Unknown IDs return a 404; unauthorized equipment returns 403.
7. On success, mobile opens `AssetDetails` by ID; `GET /assets/{id}` rechecks company scope and visibility before returning the detail DTO.
8. The mobile Maintenance tab reads `/meters/asset/{id}`, paginates `/preventive-maintenances/search` filtered to the asset, and reads `/asset-downtimes/asset/{id}`. The work-order, meter and downtime asset collection endpoints now call the shared company-scoped asset access check. Work-order and meter collections also filter rows by existing visibility rules; meter collection requires `METERS` view permission.
9. `GET /tasks/work-order/{id}` now delegates to the shared work-order access check, which scopes the work order lookup to the authenticated company before checking its existing role/assignment visibility.

This trace does **not** establish that a physical NFC tag, camera permission prompt, or installed binary works on a particular device. NFC requires a native build; Expo Go is not an adequate test environment for this project's native dependencies.

## Findings requiring attention

1. The scan flow used to offer equipment creation on any lookup failure, including network and access failures, and checked the Work Orders create permission. It now offers creation only after a server 404 and checks `ASSETS` create permission.
2. The asset lookup endpoints used to disclose the mini equipment DTO based on company membership alone. They now enforce the role's asset visibility rule. Detail lookup is also company-scoped.
3. NFC reads return `tag.id` without parsing an NDEF payload. Android requests NDEF and UID-capable technologies; iOS requests MIFARE/ISO 15693. Physical compatibility and lifecycle behavior remain unverified on both platforms. A tag identifier is not an authorization credential.
4. Barcode/NFC duplicate checks exist in application service code. The historical schema changelog explicitly removed the old uniqueness constraints, and no current composite tenant-scoped uniqueness constraint was verified. Concurrent assignment can therefore still require a separately reviewed data-integrity migration.
5. The QR in Web asset details encodes the barcode value. It is a stable identifier, not a secret. The backend must continue to authenticate and authorize every lookup; do not put sensitive asset details or authorization data into the QR payload.
6. Offline scanning is not implemented: Home rejects opening the scan flow without internet, and no durable scan-resolution queue/reconciliation path was found.
7. The asset-related Work Order, Meter and downtime collection endpoints previously loaded equipment by global ID before returning related records. They now use `AssetService.checkAccessToAssetId`, which scopes the lookup to the authenticated company and checks asset visibility. Work-order rows are restricted to the authenticated company and existing WO visibility rule; the shared work-order access method now scopes individual WO/task reads by company as well. Meters also enforce meter permission and per-meter visibility.

## Audit limits

The scoped application changes include the scanner and authorization fixes and the mobile Maintenance tab. Tests validate code-level behavior only. Live API status, tenant data, role configurations, camera/NFC hardware, tag compatibility, and production feature entitlements still require environment/device acceptance checks.

## Inspection history dependency

`GET /tasks/work-order/{id}` returns task records for one work order and checks the work order's view permission, but `/work-orders/asset/{id}` returns work-order DTOs without task data. A client-side inspection summary would need fan-out requests per work order, and the current task payload does not establish an inspection completion timestamp beyond the task audit fields. Keep a dedicated asset inspection-history summary out of this increment until its data semantics and efficient aggregation path are agreed; reuse the existing task/detail screens for execution meanwhile.
