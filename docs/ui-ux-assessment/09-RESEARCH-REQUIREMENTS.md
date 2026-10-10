# External research and prototype requirements

No new external reference was consulted for this assessment, and no reference URL is invented here. Research is the next phase before major redesign, per `docs/design.md`; focus on interaction patterns, not copying a visual composition.

| Screen category | Sources to search | Patterns/questions to compare |
|---|---|---|
| Work-order operations dashboard | Dribbble, Behance, Material Design, IBM Carbon | Queue triage, overdue/priority emphasis, filters, task launch and operational density. |
| Mobile WO execution | Mobbin, Material Design, IBM Carbon, native accessibility guidance | Thumb-zone actions, offline/weak-network status, task checklist, time/parts/photo capture, close confirmation. |
| Requests → WO qualification | Dribbble, Behance, Carbon | Intake clarity, request context, relation to asset and action hierarchy. |
| Asset 360 / hierarchy | Behance, Material Design, enterprise asset management references | Identity header, hierarchy breadcrumbs, condition/history, related WO/parts/meters and progressive detail. |
| PM editor / schedule forecast | Figma Community, Dribbble, SAP Help/Material Design | Simple/advanced mode, recurrence builder, forecast timeline, actual vs planned calls, multi-counter explanation. |
| Inventory and procurement | Carbon, Material Design, Mobbin | Scan/search, stock status, issue/return quantities, approval visibility, responsive tables. |
| Analytics | Carbon, Material Design, dashboard case studies | Date ranges, filter hierarchy, data freshness, empty/error states, readable chart/table alternatives. |
| Company profile/documents | Carbon, Material Design, Figma Community | Legal profile sections, site scope, branding upload, signatory controls and immutable issued document. |
| Cross-app shell and navigation | Mobbin, Carbon, Material Design, Figma Community | Task-centered grouping, role navigation, search/quick-create, responsive behavior and consistency. |

## Minimum research package

1. Select at least 5 relevant references across at least 2 sources; record link, date accessed, platform, flow, strengths, weaknesses and relevance.
2. Compare at least 3 plausible patterns for each major redesign scope; include current QPM pattern as an option.
3. Note which principle transfers and what must be adapted for mining/industrial use, language, permissions and offline limits.
4. Avoid exact page clones, proprietary asset reuse and unsupported functional assumptions.
5. Save findings under `docs/ui-ux-assessment/research/` and cite them in any future design proposal.

## Prototype requirements

Prototype states: normal, loading, empty, API error/retry, permission denied, no entitlement, unsaved changes, validation error, success, weak network and stale data. Test at desktop (1440), compact laptop/tablet (1024), mobile (390); include keyboard/focus and touch. Measure the selected task's success, steps, time, input errors and recovery against the baseline. User acceptance gates must be agreed from the observed baseline, not generic benchmarks.
