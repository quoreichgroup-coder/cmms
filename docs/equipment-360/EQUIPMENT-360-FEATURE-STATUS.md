# Equipment 360 — Feature status matrix

Status describes repository evidence. “Implemented but not tested” means the path exists but no end-to-end live/device verification was available. The scan authorization and UI handling fixes are covered separately in the test report.

| # | Capability | Status | Evidence and current limit | Next action |
|---|---|---|---|---|
| 1 | Equipment create/edit/retrieve | IMPLEMENTED BUT NOT TESTED | `AssetController` POST/PATCH/GET; `AssetService`; mobile create/edit/details screens; API `AssetServiceTest` and `AssetIntegrationTest`. | Run role-based create/edit/retrieve checks against a seeded server. |
| 2 | Hierarchy and functional locations | IMPLEMENTED BUT NOT TESTED; CHILD EQUIPMENT SUMMARY ADDED | `Asset.parentAsset`, `Asset.location`, `/assets/location/{id}`, paginated `/assets/children/{id}/paginated`; mobile hierarchy and parent navigation. The mobile Details tab now lists up to five children and links to their details/full tree. Parent and child service reads now apply tenant and existing per-asset visibility checks. | Execute the new API authorization tests and verify multi-level paging on a seeded server. |
| 3 | Equipment 360 detail page | PARTIALLY IMPLEMENTED; MAINTENANCE, HIERARCHY AND INSPECTION SUMMARIES ADDED | Web `Assets/Show/AssetOverview.tsx` composes multiple summaries. Mobile details includes meter/PM/downtime summaries, marks zero-duration active downtime, shows child equipment, and provides on-demand inspection review; other tabs cover WOs, Files and Parts. | Verify on Expo/device with role and entitlement combinations; lifecycle history and condition trends remain separate gaps. |
| 4 | Equipment search and identification | IMPLEMENTED BUT NOT TESTED | `POST /assets/search`; mobile `AssetsScreen`, selector and Home scan entry. Search permission filtering in `AssetService.getSearchCriteria`. | Verify large data sets, role filters and search latency. |
| 5 | NFC registration/assignment | PARTIALLY IMPLEMENTED | `Asset.nfcId`; asset create/edit form field; service duplicate check; `NFC_BARCODE` entitlement. No lifecycle for replace/revoke/history. | Define tag enrollment/replacement audit requirements before expanding. |
| 6 | NFC reading on Android and iOS | IMPLEMENTED BUT NOT TESTED | `SelectNfcModal.tsx` selects Android NDEF/A/B/F/V and related technologies, or iOS MIFARE/ISO 15693; `getTag().id` is sent to the existing lookup. `app.config.ts`, iOS NFC usage description and TAG reader entitlement are present. No physical device execution evidence. | Test supported tags, cancellation and background/resume on Android and a compatible iPhone using a native development/signed build. |
| 7 | QR generation and assignment | PARTIALLY IMPLEMENTED | Backend may auto-generate UUID barcode in `AssetService`; Web `Assets/Show/AssetDetails.tsx` renders/downloads a QR for non-empty barcode; mobile can store barcode. QR print/label enrollment UX is not end-to-end. | Validate generated code, label print dimensions and decode-to-lookup. |
| 8 | QR/barcode scanning | IMPLEMENTED BUT NOT TESTED | Expo `CameraView` in `SelectBarcodeModal.tsx`; camera permission helper; one scan guarded by local state. No physical device test. | Test QR and supported 1D symbologies, denial, retry and repeat scans. |
| 9 | Equipment resolution after scan | IMPLEMENTED, FIX APPLIED; DEVICE NOT VERIFIED | `GET /assets/nfc`, `/assets/barcode`, company-scoped repository lookups. Lookup and detail authorization now enforced; unknown IDs return 404. | Run authenticated positive/negative integration and handset tests. |
| 10 | Maintenance history | PARTIALLY IMPLEMENTED | Web has `AssetWorkOrders`, `AssetMaintenanceSummary`, `AssetDowntimeSummary`; mobile now lists downtime records and related WOs, but has no chronological asset event feed. | Add timeline only after a stable, auditable asset-history feed is defined/reused. |
| 11 | Work orders and maintenance plans | PARTIALLY IMPLEMENTED; MOBILE SUMMARY ADDED | Web overview links related WOs and filters PM by asset; APIs `/work-orders/asset/{id}` and `/preventive-maintenances/search`; mobile details exposes WOs and loads enabled PM plans through the existing search API. | Verify with limited permissions and plans beyond the first API page; detailed execution remains in existing screens. |
| 12 | Inspections/checklists | PARTIALLY IMPLEMENTED; MOBILE ON-DEMAND SUMMARY ADDED | Checklist and `TaskType.INSPECTION` exist; tasks execute through Work Orders. Mobile Asset 360 now lists related WOs and retrieves/filter inspection tasks only when a WO is expanded, using the existing guarded task endpoint. It displays the saved result and notes without inferring an inspection date. | Verify API authorization and result values on a seeded device session; standalone inspection records and an aggregated asset timeline remain absent. |
| 13 | Condition monitoring/measurements | PARTIALLY IMPLEMENTED; MOBILE METER SUMMARY ADDED | Meter and meter-trigger APIs/models exist; Web `AssetMeterSummary`; mobile Maintenance tab displays related meters and available last/next reading dates. It does not infer condition or trends. | Add trends only after validating history API, units and thresholds. |
| 14 | Equipment documents/attachments | IMPLEMENTED BUT NOT TESTED | Asset file association in model/DTO; Web `AssetFiles`; mobile `AssetFiles` and shared `AttachmentList`. | Verify view/upload/delete permission boundaries and file network errors. |
| 15 | Spare parts/components | IMPLEMENTED BUT NOT TESTED | Asset-Part many-to-many, `AssetParts` Web and mobile screens, related selectors. | Verify part quantity/stock semantics; avoid treating association as installed-component lifecycle. |
| 16 | Activity timeline/audit trail | PARTIALLY IMPLEMENTED | Work Orders have `WorkOrderHistory` and Envers history; no chronological asset event feed or scan/tag events found. | Scope asset timeline and event retention separately; no fabricated scan history. |
| 17 | Role and site security | PARTIALLY IMPLEMENTED; FIX APPLIED | `Asset.canBeViewedBy`, company-scoped scan lookups, site field; direct asset detail previously used global `findById`; changed to `findByIdAndCompany`. Asset-linked work-order, meter and downtime collections scope the asset first. Work-order detail/task access now scopes the WO to the user's company before applying its existing visibility rule; meters require `METERS` permission and `Meter.canBeViewedBy`. | Review remaining asset child/edit/delete/file endpoints for consistent tenant and site checks. |
| 18 | Offline scan and synchronization | NOT IMPLEMENTED | Home checks connectivity before scan; no scan cache, pending resolution queue, or reconciliation was found. | Keep out of MVP unless conflict policy, revocation freshness and privacy are approved. |
| 19 | Mobile navigation and Equipment 360 UI | PARTIALLY IMPLEMENTED; MAINTENANCE, INSPECTION AND CHILD EQUIPMENT SUMMARIES ADDED | Registered `ScanAsset`, NFC/barcode modals and six equipment detail tabs. Maintenance, on-demand inspection and child-equipment summaries use existing APIs/theme tokens and expose access, loading, error/retry and empty states. | Verify on Expo/device and continue with supported lifecycle records; a dedicated asset timeline is not claimed. |
| 20 | Equipment KPIs/reliability | PARTIALLY IMPLEMENTED | Asset analytics DTOs/controllers exist; Web analytics and downtime summaries exist. Mobile 360 KPI surface absent; metric definitions/data sufficiency not validated here. | Validate formula/source coverage before displaying MTBF, MTTR or health scores. |

## Verified scan-flow changes in this continuation

- Scan lookup now checks visibility within the tenant before returning the mini DTO.
- Asset detail retrieval now scopes the database lookup to the authenticated company before role checks.
- Mobile offers “create equipment” only for HTTP 404 and only for users with `ASSETS` create permission; 403/network/license errors stay errors.
- NFC and barcode query values are URL-encoded.

These changes do not add QR/NFC enrollment tokens, offline support, new permissions, or schema/API fields.

## Mobile maintenance summary added in this continuation

- `mobile/screens/assets/details/AssetMaintenance.tsx` loads meters, all pages of enabled PM plans for the current asset, and downtime records from existing endpoints. Upcoming dated plans sort first; up to ten downtime rows display without fabricated status or reliability KPIs.
- Meter and PM cards navigate to existing detail screens. Each section has independent loading/error/empty/access states, pull-to-refresh, and aborts in-flight reads when refreshed or unmounted.
- Meter and downtime asset-collection endpoints call the shared company-scoped asset access check before returning records.
- No database migration, API contract, permission rule or business workflow was added.

## Hierarchy summary added in this continuation — 14 October 2026

- `AssetDetails.tsx` now retrieves the first five child equipment through the paginated hierarchy endpoint and links each row to its Equipment 360 detail. A separate action opens the existing full hierarchy screen. Request is skipped without the existing ASSETS view permission; loading, retryable failure, empty and denied states are visible.
- The endpoint previously fetched a parent globally and returned child records without applying per-equipment visibility. `AssetService.findChildrenPaginated` now checks the parent through the shared company-scoped access method; broad viewers query children within their company, while restricted roles query only equipment they created or can view through direct/team assignment or primary responsibility. Root hierarchy applies the same visibility distinction. Existing route and page response remain unchanged.
- API service tests cover cross-company parent lookup, invisible parent denial, and the restricted-role repository query. They require execution with Maven, unavailable in this environment.
- Expo Web bundle, mobile TypeScript and regression checks passed; physical device and live API tests remain outstanding.

## On-demand inspection review added — 14 October 2026

- New mobile `AssetInspections` tab loads the asset's visible work orders through the established related-work-order flow. Each WO exposes a separate expansion action that reads `GET /tasks/work-order/{id}` only when selected, filters to `INSPECTION` tasks and shows label, saved PASS/FLAG/FAIL result and notes.
- Per-order requests have loading, retryable error and no-inspection states and are aborted when the row collapses or unmounts. The normal WO card still opens the existing Work Order detail screen. No new endpoint, task mutation, status transition or inferred timestamp is introduced.
- TypeScript, 13 mobile regression suites, Prettier, `git diff --check` and Expo Web export pass. Physical Android/iOS and live role-based API behavior remain unverified.

## Active downtime presentation clarified — 14 October 2026

- `AssetDowntime.duration === 0` is the backend's existing marker for an open downtime. The Equipment Maintenance list now labels those records “Ongoing”/“En cours” with the existing error/on-error semantic colors; completed records continue to show their recorded duration. No timer, status mutation or new calculation is introduced.
