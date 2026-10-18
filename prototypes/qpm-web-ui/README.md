# QPM Web UI prototype

Standalone React 17 / MUI 5 concept workspace. Interactions and records are local and illustrative; this project does not connect to the QPM API.

Run from this directory with the repository's existing frontend dependencies available through the local, ignored `node_modules` link:

```bash
npm start
```

Required views: Dashboard, Work Orders list, Work Order detail, Requests, Equipment 360 and Appearance. The footer opens the component gallery. The `src/tokens.js` palette maps the current mobile authentication reference for design evaluation only.

The workspace supports desktop/tablet/mobile widths and Light/Dark/System appearance. Its views and component gallery use local sample records only. Buttons that look actionable show an explicit demonstration dialog or toast; they never mutate QPM records.

Do not deploy this folder or copy its mock actions into production without review. Production routes, permission gates, request data, transitions and API behavior remain untouched.

Build verification on 14 Oct 2026: `npm run build` completed successfully using the existing React 17/MUI 5 dependency tree. Browser screenshots could not be captured in this environment: the installed Chromium Snap is blocked by `snap-confine`/AppArmor, and the configured Chrome DevTools runner has no stable Chrome executable. Capture desktop/tablet/mobile screenshots during visual review before approval; no authenticated production baseline screenshot was available for a truthful before/after comparison.

## Equipment identification prototype (WEB-062)

The Equipment 360 overview includes an interactive QR preview and SVG download. It encodes only the sample asset barcode (`CV04-METSO-9C21`), never the asset name, location, or maintenance data. This follows the existing Web implementation in `frontend/src/content/own/Assets/Show/AssetDetails.tsx`, which renders a QR from `asset.barCode` and downloads it as PNG. The proposed production interaction is “Generate label” from a saved asset’s existing barcode, with preview/download/print; no new identifier or API contract is needed. Production lookup already has `/assets/barcode?data=...` and `/assets/nfc?nfcId=...` endpoints; scanning remains subject to the existing server-side company, access, and `NFC_BARCODE` entitlement checks.

The NFC dialog can attempt a real Web NFC read on a supported device after an explicit click. It reports a serial number or text NDEF record and supports cancelling the active scan. This prototype does not send the result to QPM or assign a tag. Web NFC is limited to compatible browsers/devices, secure contexts and NDEF records. The native app currently resolves `tag.id`; before wiring browser reads to `/assets/nfc?nfcId=...`, compare the browser's returned `serialNumber` with the native value. If the formats do not match, keep NFC enrollment/lookup in the native app and use QR/barcode on Web. A tag identifier is only a lookup key, never authorization; the server must continue enforcing company, access and entitlement checks.

Browser constraints are based on the [MDN Web NFC overview](https://developer.mozilla.org/en-US/docs/Web/API/Web_NFC_API), the [MDN `NDEFReader` reference](https://developer.mozilla.org/en-US/docs/Web/API/NDEFReader), and [Chrome's Web NFC guide](https://developer.chrome.com/docs/capabilities/nfc). MDN marks Web NFC as limited availability and secure-context-only; Chrome documents the Android/browser permission and user-gesture requirements. Device-level behavior remains unverified in this prototype.
