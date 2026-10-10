# Screen inventory — Web and Mobile

The machine-readable record is `screen-inventory.json`. It includes 106 active web destination entries, 3 web redirects, the one commented-out declaration separately, and every registered native navigator screen. IDs and routes are derived from route/navigation declarations. Roles, API families, action summaries and priorities are classified from the owning module and must be confirmed against actual page code/role sessions where marked inferred.

## Web groups

There are 106 active rendered route entries by the counting rule in `02-APPLICATION-ARCHITECTURE.md` (includes public, auth, admin, layout and route-view entries; excludes redirects and one commented entry). Main groups and code entrypoints:

| Group | Route families / views | Owning source |
|---|---|---|
| Public/auth/account | login/register/recovery/verification/deleted, OAuth, public request portal, payment success, license notices, profile | `frontend/src/router/{index,account,oauth}.tsx`; `content/pages/`; Request Portal public page |
| Work management | WO list/detail; requests list/detail; WO status, analysis, aging, time/cost; request analytics | `frontend/src/content/own/{WorkOrders,Requests,Analytics}` |
| Maintenance | PM list/detail/configuration; meter list/detail; trigger and cycle forms | `frontend/src/content/own/{PreventiveMaintenance,Meters}` |
| Assets and locations | asset hierarchy/list; 8 asset detail tabs; locations list/detail | `frontend/src/content/own/{Assets,Locations}` |
| Materials/procurement | inventory parts/sets/detail; purchase-order list/detail/create; categories | `frontend/src/content/own/{Inventory,PurchaseOrders,Categories}` |
| Organization | people/teams; vendors/customers; files | `frontend/src/content/own/{PeopleAndTeams,VendorsAndCustomers,Files}` |
| Reporting | WO, asset, part, request analytics routes | `frontend/src/content/own/Analytics` |
| Administration | general/features/custom fields/workflows/portals/checklists/roles/integrations; company/legal/sites/history/license/subscription; import/export; upgrade/downgrade/switch account | `frontend/src/content/own/{Settings,CompanyProfile,Subscription,Imports,UpgradeAndDowngrade,SwitchAccount}` |

## Mobile groups

76 registered navigation destinations appear in `mobile/navigation/index.tsx`; 97 implementation files are located under `mobile/screens`. Navigation includes auth, authenticated bottom tabs, superuser switching, create/edit/detail views, selection modals and WO execution modals. Group details and exact route names are in JSON.

| Group | Implemented screen families |
|---|---|
| Authentication | loading, sign-in, register, verify, custom server |
| Work | home, WO list/details/create/edit, tasks, filters, complete WO, additional time/cost create/edit, WO statistics |
| Requests | list, create/edit, details |
| Maintenance/meters | PM list/details, meter list/details/create/edit, meter/task/checklist selection |
| Asset hierarchy | assets and locations lists/create/edit/details; detail tabs for details, WO, parts/files/assets |
| Inventory/partners | parts list/create/edit/details; vendors/customers list/details/edit |
| People/admin | people/teams, profiles/details/edit/invite, settings, company profile, license, switch account, notifications, feedback |
| Capture and selectors | scan asset, NFC/barcode, assets/locations/users/teams/parts/categories/tasks/vendors/customers/checklists selectors, upload action sheet |

## Inventory interpretation

Some mobile screen files are tab content rendered inside a parent navigator (e.g. asset/part/location details); some registered screens use one file for several resource types. The 76 route registrations are therefore the reproducible count of navigable destinations; 97 counts implementation files and should not be added to it. Web counts are route render entries, not unique React page files. The JSON preserves these distinctions and marks inferred role/permission metadata.
