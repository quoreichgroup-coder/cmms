# Pilot screen specifications for prototype

Prototype pilot: **request → triage → work order → field execution → asset history**, with separate PM preview scenario. These are wireframe-level requirements; all route/component links refer to present implementation from `screen-inventory.json`.

## P0-A — Supervisor work queue (Web)

**Screens:** WEB-045/046 Requests; WEB-054/055 Work Orders. **Source:** `frontend/src/content/own/Requests/`, `WorkOrders/`, `SidebarMenu/items.ts`.

- **Goal:** identify the next request/WO requiring attention without opening every record.
- **Hierarchy:** page title + count/time filters; search; status/priority filters; queue group (e.g. due/overdue/unassigned only if available in current data); table columns request/WO ID, short title, equipment/location, priority, status, due/age, assignee; row action opens the existing record.
- **WO compact card/table row:** first line title and ID; second line asset + location; right side priority/status and due time; assignee avatar/name; overdue text and date. Mobile list counterpart should keep the same information order.
- **States:** loading skeleton; no matching filters with clear reset; no records with existing create action gated by role; API error with retry; restricted action absent/disabled with explanation; save/assign success only after API response.
- **Responsive:** desktop sortable dense table, tablet fewer secondary columns, mobile card list; no forced horizontal scroll for the primary task fields.
- **Preserve:** request/WO status transitions, payload, sort/filter server semantics, permissions and entitlement checks.
- **Validation:** supervisor processes a supplied request, creates/assigns a WO to the correct asset/site, returns to same queue; record success, time, misclicks and permission/API response.

## P0-B — WO record and execution (Web + Mobile)

**Screens:** WEB-055; MOB-002/003/048/063–066/073. **Source:** `frontend/src/content/own/WorkOrders/Details/`; `mobile/screens/workOrders/{WODetailsScreen,TasksScreen,CompleteWorkOrderModal}.tsx` and time/cost forms.

- **Header:** WO number/title; status text; priority chip distinct from status; asset/location breadcrumb; due date; assignee(s); primary permitted action. Keep identifiers visible at all times.
- **Sections:** Overview and instructions; task checklist/progress; work log/time; parts/costs; photos/files/comments; history. On small mobile, show concise sections as top-level anchors or local tabs that fit; avoid nested tabs.
- **Execution interaction:** one row/tap to open task; completion state plus explicit record action; short work-note/time entry; parts and photos in context; completion confirmation summarizes unfinished required inputs only if already mandated by existing logic.
- **Feedback:** saving disables duplicate submission and announces completion; server error preserves editable values if current state can support it; never show “saved” on optimistic failure. Use clear denied/entitlement state.
- **Validation:** assigned technician reads equipment, priority and next action; records task/time/part/photo as allowed; completes under current workflow; supervisor verifies WO detail and asset history. Android/iOS/desktop evidence required.

## P0-C — Equipment / location context (Web + Mobile)

**Screens:** WEB-052/053/060/062–069; MOB-029–034/045/057/058. **Source:** `frontend/src/content/own/Assets/Show/`, `Locations/`, `mobile/screens/assets/`, `locations/`.

- **Identity header:** asset number and name; status/condition only if current fields exist; site/location and parent path; QR/barcode action if currently supported; available create WO/meter/photo actions permission-gated.
- **Content:** overview first; operating details; related WOs, parts, files, meters/readings, downtime and analytics. Use counts only when they match fetched dataset scope. Location hierarchy remains clear separately from site/company identity.
- **Navigation:** tree/search for hierarchy; on phone full detail with scrollable same-record tab set or section list; maintain selected tab and title visibility. A direct WO deep-link route remains usable.
- **Validation:** find conveyor by search and scan; navigate parent/child; open recent WO and meter; back returns to hierarchy position. Check narrow devices and long translated labels.

## P1-D — PM plan and preview (Web)

**Screens:** WEB-043/044/047/048, plus meter-related asset WEB-067; native MOB-011/014–018. **Source:** `PreventiveMaintenance/index.tsx`, `PMPlanConfigurationEditor.tsx`, `MeterCycleForecast.tsx`.

- **Basic mode:** plan name, trigger type, asset/location, recurrence/counter, WO content, assignment and date horizon. Provide a compact live summary of next occurrences and separate forecast from saved register/generated WO.
- **Advanced mode:** strategy plan, cycles, multi-counter combination, tolerances and timing disclosed only when selected. Define inline descriptions and examples; do not flatten OR/AND into unexplained toggles.
- **Forecast:** date/threshold, trigger basis, forecast status, generated WO relation, last actual meter reading and unit. No implied WO creation from forecast alone.
- **Validation:** configure existing weekly PM, inspect future calendar, configure counter/multicounter test scenarios in docs; confirm preview is unsaved/non-mutating and saved call register remains distinguishable.

## Prototype state checklist

Each screen spec needs initial/selected/hover/focus/disabled/loading/empty/error/retry/denied/no entitlement/saving/success/unsaved plus localization and responsive variants. Use realistic but non-production examples. Do not create a polished design image as the only deliverable: include clickable journey and test notes.
