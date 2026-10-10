# Mobile navigation and field interaction proposal

## Navigation direction

Preserve React Navigation and the five-tab native model. Retest labels/grouping rather than replacing navigation architecture. Candidate primary tabs:

1. **Home** — today/overdue/recent assigned work and connectivity/save feedback (MOB-001 root; exact landing content verify).
2. **My Work** — assigned work list, prioritized by existing due/priority semantics (MOB-073, MOB-044).
3. **Requests** — list and create/report path (MOB-075, MOB-007).
4. **Create / Scan** — central role-aware action that launches only existing WO/request/meter/asset/scanner routes (MOB-005, MOB-007, MOB-011, MOB-045). Validate the current Create tab's behavior; never introduce a new route/API as part of visual prototype.
5. **More** — assets, locations, PM/meters, parts, people, notifications, settings, profile (MOB-014–043, MOB-046, MOB-067–076) grouped by operational vs administrative purpose.

This is a testable proposal, not approval to change tab names or route contracts. If an icon-only center affordance harms screen reader or discovery, use a labeled tab/button.

## Field technician flow

**My Work → WO detail → task → record work → confirm completion → review WO close.** Keep asset/location, WO number, priority, due state and permitted current action at hand. Present tasks as tappable rows with text status, completion control and a clear “log time/note” action. Photos/attachments, parts and meter readings use contextual actions only where supported by current app. Do not imply offline write-queue capability: Redux persistence exists, but the current assessment did not establish durable mutation synchronization.

Use bottom sheets for short pickers/actions (already present), full-screen forms for multi-field create/edit, and explicit save/cancel for unsaved values. Keep destructive close/delete separate from ordinary task completion. On poor network, report pending/failure truthfully and preserve entered values only to the extent current state behavior supports.

## Ergonomics and accessibility

- One dominant action per screen; reachable by thumb and not blocked by keyboard, nav bar, camera cutout or device insets.
- Numeric keyboard for meter/time/quantity; units persist beside values; no ambiguous locale separators.
- High-contrast text, ≥44–48 dp hit-target design goal, no status conveyed through color alone, sunlight legibility test.
- Show title without truncating equipment context; use two-line/ellipsized hierarchy only after a smaller width is tested.
- Horizontal related tabs must scroll/focus predictably and reveal selected state; historic 2026-10-03 screenshots show truncated asset title and “Ordres de travail” label. Current behavior is unverified.
- Camera/storage/NFC/barcode permission denials explain how to continue manually; do not hide platform failures.

## Devices/states to prototype

Android phone 360–430 dp, iPhone 390 dp, large text, landscape, screen reader, bright light, weak network. Include loading, empty assigned list, API failure, permission denied, upload failure/retry, unsaved changes, success, and stale data; mark offline actions unsupported unless implemented and verified. Compare Fiix/Microsoft described field sequences; do not inherit their distinct booking/task/status rules.
