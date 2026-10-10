# Incremental redesign roadmap

Order is gated by operational readiness and measured evidence. It is not authorization to change API/business logic.

| Phase | Priority | Deliverables | Visual/interaction boundary | Exit gate / risk |
|---|---:|---|---|---|
| 0. Healthy baseline | P0 | Stable test API, test account/roles, current screenshot set, route smoke map, error/status samples. | No product changes. | Logs and health endpoints stable; protect real data. |
| 1. Observe pilot tasks | P0 | Interview/test requester, planner/supervisor, technician; record completion, steps, time, errors/recovery. | Observe existing workflow only. | Representative users and realistic but non-production data. |
| 2. Research and compare | P1 | Research >=5 relevant references from >=2 sources; compare 3 UI patterns per major area; document rationale and citations. | No cloning; no visual implementation. | `docs/design.md` §4.3/§36 deliverables completed. |
| 3. Prototype pilot | P1 | Work request→WO→execution + asset 360; desktop/tablet/phone; error/empty/loading/permission/offline states. | Visual + interaction proposal; no backend changes. | Task test with target users; baseline and acceptance thresholds agreed. |
| 4. Shared shell/design foundation | P2 | Semantic color/type/spacing, sidebar/mobile navigation, buttons, forms, status, async state recipes. | UI-only unless interaction delta separately approved. | Accessibility, responsive screenshots, regression evidence, no permission bypass. |
| 5. Operational web modules | P2 | WO/Requests, Assets/Locations, PM/Meters, in that order; tables and details. | Preserve existing API and business behavior. | Per-role module acceptance; measured interaction improvements. |
| 6. Native field modules | P2 | Home/WO list/detail, execution, capture/upload, request and asset lookup. | Separate React Native patterns; offline behavior only if separately approved. | Android/iOS device validation, weak-network scenarios, accessibility. |
| 7. Management modules | P3 | Inventory/procurement, People/Admin, analytics, company/document settings. | Preserve metric definitions, entitlements, immutable documents. | Real data verification and permission matrix. |
| 8. Brand and release | P3 | Approved QPM identity, localized branding, release notes, signed APK/IPA channels. | No brand decisions presumed. | Product/brand approval, install/update test and rollback plan. |

## Pilot recommendation

Pilot one coherent maintenance lifecycle across platforms:

1. Requester submits a conveyor fault from mobile/web.
2. Supervisor qualifies it and creates/assigns a WO to an existing asset/location.
3. Technician finds the WO, performs tasks, records time/reading/part and adds photo evidence.
4. Supervisor reviews and completes it; asset history reflects the intervention.
5. Planner creates a separate weekly PM and checks forecast/call register without confusing forecast with generated WO.

This hits the highest frequency and risk surfaces, tests route navigation and shared patterns, and respects the mining pilot. Do not include new approval rules, multi-company behavior or AI.

## Changes requiring separate authorization

- **Visual-only:** colors, typography, spacing, card/table styling, icons, responsive layout, illustration/branding assets after approval.
- **Interaction:** IA/navigation changes, moving actions, simplifying forms, progressive disclosure, altering confirmations. Prototype and approve before implementation.
- **Functional/business:** changing status transitions, required fields, defaults, PM calculation, inventory accounting, permissions or entitlements. Requires product approval.
- **Backend/API/database:** new fields/endpoints, schema migrations, persistence or offline sync. Explicit separate scope and migration plan required.

## Regression gates

Keep current user roles/permissions and API payloads; validate primary journey, keyboard, errors, empty data and 1440/1024/390 widths per phase. Native changes require Android and iOS builds/device checks. Re-check PDF issue/snapshot, localization, dates/timezones, number units, feature/license gates and user-company boundaries.
