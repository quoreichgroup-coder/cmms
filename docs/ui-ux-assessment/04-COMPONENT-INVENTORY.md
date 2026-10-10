# Shared component inventory

## Count and boundaries

Source-level reusable component modules: **59 web** (16 in `frontend/src/components`, 43 in `frontend/src/content/own/components`) and **37 native** (under `mobile/components`), total **96 platform-specific module files**. This is a reproducible directory count; it includes helpers/forms/action sheets and is not a count of distinct visual primitives. Web and native components are not shared at runtime.

## Web component families

| Family / evidence | Recommendation | Rationale |
|---|---|---|
| App shell: `ExtendedSidebarLayout`, header, sidebar/menu, breadcrumbs/title context | **REFINE** | Keep responsive layout and authorization-aware links; validate information architecture and collapse behavior before redesigning. |
| Form fields: `content/own/components/form/`, custom selects, date controls, task/checklist selector | **KEEP + CONSOLIDATE** | Existing configurable forms and Yup/Formik rules are valuable; normalize error/helper/save patterns while retaining field permissions and feature gating. |
| Tables: `CustomDatagrid2`, `TableCustomized`, MUI DataGrid, TanStack Table usages | **CONSOLIDATE** | Multiple patterns increase behavior drift. Compare sorting, pagination, filtering, hierarchy, row actions and mobile adaptation before selecting shared recipes. |
| Status, priority, avatars, chips, wrappers, confirmation dialogs | **KEEP + REFINE** | Preserve semantics and domain mappings; document status color contrast and destructive-action confirmation. |
| Analytics charts (ApexCharts wrappers) | **KEEP + REFINE** | Avoid changing metric semantics; standardize data range, units, loading/empty/error and retry affordances. |
| Drawers, dialogs, menus and modal forms | **REFINE** | Retain short contextual dialogs; investigate long or nested flows and focus/keyboard/scroll behavior. |
| Loading, no-row and permission/error wrappers | **CONSOLIDATE** | Ensure every async state communicates loading, empty, error, access denied and recovery distinctly. |

## Native component families

| Family / evidence | Recommendation | Rationale |
|---|---|---|
| Paper theme and shared `Themed`, `StyledText`, `Tag`, `IconWithLabel` | **KEEP + REFINE** | Native semantics are appropriate; align tokens and status vocabulary with Web without importing web controls. |
| Shared form primitives, `BasicField`, `ListField`, `NumberInput`, date/time picker | **KEEP + REFINE** | Preserve ergonomics; validate keyboard types, numeric decimal entry, focus order, labels and small-screen scrolling on real devices. |
| Action sheets and resource selectors | **KEEP + CONSOLIDATE** | Core to mobile selection/quick actions; test touch targets, search, long lists, permissions and cancellation. |
| File/photo/audio/signature/camera components | **KEEP + REFINE** | Operationally valuable; physical Android/iOS permission, upload and retry states remain unverified. |
| Loading dialog, task, comment, quantity and status components | **KEEP + REFINE** | Reuse rather than recreate; provide consistent success/error and accessible text labels. |

## Tokens and visual foundations

Web theme configuration lives under `frontend/src/theme/`; MUI/Emotion are already installed. Native color tokens are in `mobile/constants/Colors.ts` and Paper theme in `mobile/custom-theme.ts`. The current audit has not yet measured a canonical spacing scale, typography scale, color contrast matrix or radius/elevation map across every module. Therefore **REFINE / document first**, not replace or add a UI library.

## Classification summary

- **KEEP:** domain forms, task/checklist construction, status semantics, MUI/Paper platform bases, existing charts and data workflows.
- **REFINE:** app shell, hierarchy, feedback, responsive layouts, input ergonomics and accessibility.
- **CONSOLIDATE:** table/list recipes, error/empty/loading states, selectors and repeated modal patterns.
- **REPLACE:** none approved by this assessment; evidence from prototype comparison must justify replacement.
- **DEPRECATE:** none identified safely from repository-only inspection.
