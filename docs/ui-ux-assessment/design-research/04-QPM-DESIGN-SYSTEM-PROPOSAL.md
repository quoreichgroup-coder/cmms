# QPM design system proposal

## Direction

Propose **Industrial Clarity**: calm, precise enterprise UI with an operational neutral canvas, strong text hierarchy, restrained brand accent, and semantic status colors used consistently. Use fewer decorative KPI cards, stronger alignment, compact but readable density, and clear task/action grouping. This is a candidate direction; branding remains provisional per `docs/design.md` and no final palette is approved here.

## Token model

| Token group | Candidate rule | Web / Native application |
|---|---|---|
| Color roles | `canvas`, `surface`, `surface-raised`, `text-primary`, `text-secondary`, `border`, `action-primary`, `focus`, `success`, `warning`, `critical`, `info`, `disabled`. Use labels/icons with semantic color; distinguish priority from workflow status. | Map to existing MUI theme variants in `frontend/src/theme/`; map separately to React Native Paper/custom tokens in `mobile/custom-theme.ts` and `mobile/constants/Colors.ts`. No dependency change. |
| Brand | Keep current identity configurable/provisional. Start with low-chroma neutral surfaces and one approved brand action color; derive dark/light accessible pairs only after contrast checks. | Do not treat any Dribbble palette as QPM branding. |
| Typography | Platform-native scale with shared semantic roles: page title, section title, record title, body, label, metadata, numeric/KPI. Prefer tabular numerals for IDs, dates, counts and meter values where supported. | Keep MUI/Paper typography mechanisms; verify French labels, number width and OS text scaling. |
| Spacing | Candidate 4 px base; common 8/12/16/24/32 rhythm. Dense desktop tables can use smaller row padding; touch controls must keep comfortable hit targets. | Shared names/intent, platform-tuned values. Do not blindly force identical pixel/DP metrics. |
| Shape/elevation | Small consistent radius for controls/cards; avoid nested cards. Reserve elevation for overlays/selected floating surfaces, use borders and spacing for structure. | Use current MUI and RN style systems. |
| Icons | Existing Material Icons Web and Expo vector icon families Native; select one semantic icon per concept and pair with label for critical action. | No new icon library. |
| Motion | Short, functional transitions only; respect reduced-motion and avoid animated loaders as the only system feedback. | Platform behavior follows existing libraries. |

## Domain semantics (must remain behaviorally unchanged)

- **Work status** and **priority** are independent fields; never encode “High” as a lifecycle state.
- For status chips use stable semantic text and a neutral shape; add icon/pattern as supplementary cue. Freeze exact status→color mapping from current domain model before styling.
- Due/overdue indicator includes date and explicit text; red reserved for critical/overdue/errors, not generic active states.
- Meter readings always show value + unit + timestamp/source context where available; do not infer missing units.
- Permission denial, license entitlement, API error, empty results and offline/stale state use different wording and recovery action.

## Component disposition

- **KEEP:** MUI/Emotion web base; Paper native base; existing forms and Yup validations; domain status mappings; asset hierarchy and related-record views; checklists, PM forecast/call register, charts and existing upload/scan capabilities.
- **REFINE:** `ExtendedSidebarLayout`, page/record headers, buttons/form feedback, WO card/list row, asset context header, error/empty/loading states, phone touch/focus/input ergonomics.
- **CONSOLIDATE (after parity mapping):** `CustomDatagrid2`, `TableCustomized`, MUI DataGrid/TanStack usages into documented table recipes; repetitive filter bars, selectors, dialogs, status/async wrappers. Keep feature-specific implementations where behavior differs.
- **REPLACE / DEPRECATE:** none proposed pending screen usage and regression evidence. No UI library addition justified.

## Acceptance criteria for future tokens

Before implementation, start with the existing light operational surfaces. Do not assume dark mode is required; evaluate it separately against night-shift use. Verify WCAG 2.2 AA contrast for text/focus/controls, keyboard order, screen-reader labels, 390/768/1024/1440 widths, localization and system text scaling. Use real QPM statuses and long French translations. These are prototype/release criteria, not claims already passed.
