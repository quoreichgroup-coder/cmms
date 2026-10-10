# Web information architecture proposal

## Proposed primary navigation

Keep the current protected shell and MUI stack. Test this shallow grouping as a prototype; all links remain subject to the existing permission and license filters.

| Primary group | Proposed destinations | Current inventory anchors |
|---|---|---|
| **Work** | Work Orders, Requests, calendar/queue view only if existing route supports it | WEB-045/046, WEB-054/055; WEB-103 may remain under Insights |
| **Assets** | Equipment, Functional Locations, equipment detail/related history | WEB-052/053, WEB-060, WEB-062–069 |
| **Planning** | Preventive Maintenance, Meters, schedules/forecast/call register | WEB-043/044, WEB-047/048 |
| **Materials** | Inventory/Parts, Purchase Orders, Categories | WEB-049–059, WEB-070–076 |
| **People** | People, Teams, Vendors & Customers | WEB-077–084 |
| **Insights** | Work order, asset, part and request analytics | WEB-095–103 |
| **Administration** | Company Profile, Settings, Licensing/Subscription, imports, integrations, roles, custom fields | WEB-002, WEB-007–042, WEB-085–094, WEB-104–106 |

Global header: QPM mark/name, current page context, global search only if current search/API supports it, notifications (existing), help/profile utilities. “Create” should be a role-aware menu of already available actions; it must not expose a button when permission/entitlement denies the action. Preserve visible current page, keyboard focus and active child group.

## Contextual navigation

- Use breadcrumbs to return through record hierarchy (Site → Location → Equipment → WO) only where those relations exist.
- Work Orders and Requests use list/detail patterns; on wide screens, prototype list + detail pane for triage, but preserve direct detail routes and browser history. On small screens, use full route detail.
- Asset details use local sections/tabs for overview, details, WOs, parts, files, meters, downtime and analytics (WEB-062–069). Keep those tabs in the asset context, not primary nav. Horizontal overflow gets a deliberate scroll/overflow control and selected tab remains visible.
- Settings index can group by company, maintenance setup, workflow, access, integration and licensing; keep current routes. Do not combine licensing or company legal profile with mutable document appearance unless current authorization allows it.
- Avoid a third nested menu level. Use page-level sections or short local tabs for same-object content.

## Responsive behavior proposal

| Width/context | Proposed interaction |
|---|---|
| Wide desktop | Persistent collapsible sidebar; dense tables; optional split details for operational queues. |
| Tablet/compact laptop | Collapsed rail or drawer; table hides secondary columns before horizontal scroll; primary action stays visible. |
| Phone web | Drawer navigation; single-column list cards and full-screen forms/details; sticky action only if it does not cover validation or keyboard. Native app remains preferred for field capture. |

## Validation scenarios

Prototype roles: requester, supervisor/planner, technician, admin. Try locate a new request, qualify/assign, reach assigned WO, inspect equipment history, then return to the same filtered queue. Measure task success/time, route changes, lost context and permission confusion. Keep role-based menu visibility and backend authorization unchanged. Reference principles: Carbon shell hierarchy and current task-centric QPM modules.
