# NFC and QR scanning — technical review

## Current identifier model

- Equipment stores `Asset.nfcId` and `Asset.barCode` as strings (`api/.../model/Asset.java`).
- Mobile NFC returns `tag.id`; it does not parse an NDEF payload. Android requests NDEF and UID-capable technologies; iOS requests MIFARE/ISO 15693. The app has the `NFCReaderUsageDescription` and Core NFC TAG entitlement. The module is now autolinked on iOS, but CocoaPods resolution, signed Xcode build and physical-device behavior have not yet been verified. A tag ID is not cryptographic identity or authorization.
- Web equipment details generates a QR image from `barCode` (`frontend/src/content/own/Assets/Show/AssetDetails.tsx`). The QR contains the barcode string only. Backend can auto-assign a UUID barcode according to company preferences.
- Mobile barcode/QR scanner forwards camera `data` to the barcode lookup endpoint. The lookup parameter is URL-encoded in the mobile slice.

## Authorization and abuse boundaries

- A scanned value is input, never proof of identity or user authorization. The scan endpoints require the app's authenticated user context, the `NFC_BARCODE` license entitlement, same-company lookup, and `Asset.canBeViewedBy(user)`.
- Detail fetch uses the asset ID returned from scan and independently rechecks company and visibility.
- QR payloads should stay opaque identifiers (existing random UUID barcode is suitable as an identifier). Never encode name, serial, location, work history, or bearer credentials in a public label.
- Raw NFC UID and barcode can be copied/cloned. They must not authorize maintenance actions. Actions continue to require normal QPM authentication and role checks.
- Current assignment duplicate checks are service-level and tenant-scoped. Historical changelog `2023_07_16_1689459801_drop_barcode_nfcId_unique_constraints.xml` means concurrent duplicate writes need review; do not add a production constraint until existing duplicates and null behavior are audited.

## Platform and lifecycle observations

- Android: native NFC module is configured; runtime support requires an NFC-capable device and enabled NFC. Hardware, manifest merger, device permissions, tag compatibility and cold/warm lifecycle have not been verified on-device.
- iOS: the application code now exposes NFC in scanner and asset forms and permits native module autolinking. Existing `NFCReaderUsageDescription`, TAG entitlement and MIFARE/ISO 15693 mapping are present. Availability in an installed iOS build is **not verified** until CocoaPods is resolved, the app is signed with Core NFC enabled, and a compatible iPhone/tag is tested. QR/barcode remains available as fallback.
- Expo Go: not a valid NFC verification target for this project. Use its development build or signed app containing the native NFC module.
- Camera: Expo `CameraView` requests permission using `ensureScannerCameraPermission`, offers a settings action on denial and locks after the first barcode event. Camera hardware and formats remain untested here.
- Background/cancel: NFC modal cancels the technology request on completion/unmount, but app background/resume and repeated-scan behavior need device verification.
- Network: Home blocks starting a scan when internet is unavailable. There is no offline identifier queue; lookup errors must never be converted into “not found” (fixed in this continuation).
- Latency: no production timing data available. Record p50/p95 from authenticated device-to-server tests before optimizing.
- After a successful camera/NFC read, the scanner screen now shows an accessible loading state during backend identifier resolution. A local in-flight guard ignores repeated callbacks. This is feedback only; it does not change lookup, authorization or creation rules. Real network-latency behavior remains to be tested on a device.

## Acceptance test procedure

1. Use a staging tenant with two assets in the same company, one asset in a second company, and a limited technician role that can view assigned assets only.
2. Assign a known barcode and known NDEF-compatible NFC tag to an accessible equipment. Sign in as the limited technician and scan both; verify the app opens that equipment's detail.
3. Scan an in-company but unassigned asset. Expect 403 and no create prompt. Repeat with an asset from another company; it must be indistinguishable from not found to the caller and reveal no mini DTO.
4. Scan a truly unknown value while signed in as (a) an asset creator and (b) a user without asset-create permission. Only (a) may be offered the create flow.
5. Disable the network after camera permission is granted, then scan. Verify a connection error, no create prompt and no unintended asset creation.
6. Deny camera permission, choose Retry, then open Settings and grant permission. Repeat with the app backgrounded while the camera modal is open.
7. On Android, test NFC disabled, unsupported hardware, NDEF-compatible tag, non-NDEF tag, repeated tap, rapid second tag and leaving the modal mid-read. On iOS, first verify the signed build contains `react-native-nfc-manager` and the NFC capability, then test MIFARE and ISO 15693 tags, permission/session cancellation, background/resume, and QR fallback on compatible hardware.
8. Copy and alter a QR value; verify it only resolves if it maps to an authorized record and never authorizes access by itself.
9. Run the same cross-tenant direct `GET /assets/{id}` check; it must return not found for another company's equipment.

No production QR/NFC tags should be reassigned during acceptance. Use staging/test records.
