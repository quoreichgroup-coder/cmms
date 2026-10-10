# Design system audit

## Existing foundations

Web: MUI 5.8.x and Emotion; Material icon package; MUI themes under `frontend/src/theme/`; MUI X DataGrid 5.17, custom table/data-grid and TanStack Table; Formik 2/Yup; ApexCharts/react-apexcharts; Notistack. Native: React Native Paper 5, Expo vector icons, `mobile/custom-theme.ts`, `mobile/constants/Colors.ts`, native form primitives and React Navigation. Exact versions are in `frontend/package.json` and `mobile/package.json`.

## Token audit status

| Token/family | Evidence | Assessment |
|---|---|---|
| Color | Web MUI palette/theme setup; native color constants and Paper theme. | Existing platform tokens; full semantic map, contrast and status mapping needs extraction. |
| Type | MUI theme typography and native Paper typography default/custom theme. | Keep platform-native typography; document hierarchy and language scaling. |
| Spacing/radius/elevation | MUI `sx` and component styles, individual RN styles. | No complete cross-module token catalog established in this pass; inventory before normalization. |
| Icons | MUI Material icons on Web; Expo vector icon families on Native. | Preserve per-platform icon library; define semantic mapping and avoid mixed styles within each platform. |
| Navigation | responsive sidebar/header on Web; bottom tabs/stack/modal navigation on Native. | Keep platforms distinct; consolidate information architecture and clarify high-frequency tasks. |
| Buttons/forms | MUI and project form wrappers; Paper and custom RN fields. | Keep, refine focus/disabled/pending/error/success semantics and accessible labels. |
| Lists/tables | Web custom datagrid, MUI DataGrid, TanStack; RN FlatList/list patterns. | Consolidate recipes, not libraries, after representative screen comparison. |
| Dialog/sheets | MUI dialogs/drawers/menu; native Stack modals/action sheets. | Keep; test interruption, keyboard, focus, scroll and destructive confirmation. |
| Status/priority | Domain wrappers and status tags/chips in both platforms. | Keep business mapping; audit consistent labels, colors, text contrast and localization. |
| Async states | Redux `loading` fields, Suspense loader, empty-state wrappers, Snackbars/flash messages. | Existing primitives; standardize state matrix and make retry/error accessible. |

## Classification

| Classification | Components/patterns |
|---|---|
| KEEP | MUI/Emotion web foundation; Paper/native foundation; domain model and status semantics; forms, charts, selection and checklist capabilities. |
| REFINE | Tokens, navigation, density, responsive shell, forms, action hierarchy, feedback and accessibility. |
| CONSOLIDATE | Web table recipes; duplicate status/loading/empty/error patterns; repeated selector implementations where behavior is equivalent. |
| REPLACE | None approved; no concrete measured failure warrants a library replacement. |
| DEPRECATE | None established; source search alone cannot identify unused runtime components safely. |

## Design principles for target state

- Industrial task clarity and high visual contrast; never use color alone for status.
- Explicit loading, success, empty, error, denied and offline/unsynced states.
- Field-friendly touch targets, numeric keyboard/unit/date clarity, focus order and outdoor legibility.
- Progressive disclosure for advanced PM plans; preserve full audit detail in specialist views.
- Document company/site context and immutable issue status at point of generation.
- Reuse shared terminology and semantic tokens; implement distinct web/native components.
- No AI feature, new UI library or business rule change in this redesign scope.
