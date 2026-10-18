# QPM Web maintenance dashboard — data/API boundaries

## Current implementation

The dashboard reuses the authenticated work-order analytics endpoints under
`/analytics/work-orders`. Those endpoints resolve data for the authenticated
user (and optionally a permitted child company for super accounts); the UI does
not widen that scope. The date-range endpoints used by the dashboard are:

- `POST /complete/overview`: OT created within the selected range, total,
  currently complete, `WorkOrder.isCompliant`, response time and average
  completion age.
- `POST /incomplete/overview`: open/incomplete count and average age for the
  matching created range.
- `POST /statuses`: status snapshots through the selected date range.
- `POST /complete/costs-time` and `POST /complete/costs/date`: costs on
  completed OT created within that range, split into labor, parts and additional
  costs.
- `POST /hours`: estimated and recorded hours within the selected range.

The UI calls the existing Redux thunks and API client; no backend route,
contract, permission, database or migration was added for this dashboard.

## KPI definitions and limits

| Display | Definition currently used | Important limitation |
| --- | --- | --- |
| OT created | Backend overview `total` | Uses OT creation date, not release or finish date. |
| OT completion ratio | `complete / total` for the selected creation range | A cohort ratio; it is not a frozen schedule or period-completion KPI. Denominator zero is displayed as unavailable. |
| Completed OT compliance | `compliant / complete` from `WorkOrder.isCompliant` | Generic OT compliance; it is not PM compliance. |
| Incomplete backlog | Backend incomplete count and average age | The result is scoped to OT created in the selected period; the API provides no age-band counts. The displayed age hint is applied to the mean only. |
| Maintenance cost | Labor + part + additional costs for completed OT created in the selected range | No budget/forecast is included. Currency uses company general preferences, falling back to EUR if absent. |
| Labor hours | Existing estimated and recorded hours | No shift capacity or available technician-hours denominator exists, so this is not manpower utilization. |

The dashboard keeps separate completion and generic compliance figures and
does not label either as PM Compliance.

## Metrics not represented as real values

The inspected API/model does not establish the necessary data contract for:

- Planned vs unplanned classification by actual release date and frozen-week
  deadline, including the PM01 exception.
- Frozen weekly schedule compliance.
- PM compliance and due-plan denominator.
- Technician capacity/utilization by calendar, shift, leave and work center.
- Backlog distribution into 0–7, 8–30 and over-30-day buckets.
- Notification backlog as a dashboard KPI.
- Maintenance budget and budget-versus-actual.
- Work-center performance and plant/site/discipline/equipment filters for these
  analytics endpoints.

These measures require a separately reviewed API/data contract and validated
business rules before they can be shown as production KPIs. This dashboard does
not query SAP or imply SAP ECC connectivity.
