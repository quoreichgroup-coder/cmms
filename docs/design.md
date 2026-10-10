# QPM — UI/UX Research & Design Operating Guide

## 0. Purpose

This file defines the UI/UX working conventions for QPM. It complements [product orientation](ORIENTATION-PRODUIT.md), repository instructions, and the scope authorized by the user. Explicit user instructions take precedence; this guide does not authorize new features or changes to business rules.

It is a design policy, not a completed design system or a specification of implemented features. Screen proposals, research evidence, and validation results must identify their own scope and date.

The objective is **not to copy an existing CMMS/EAM product** and not to redesign screens based only on personal taste.

Agents must:
1. inspect and understand the existing application;
2. research high-quality UI/UX patterns at the level required by section 2.1;
3. compare alternatives by workflow and user role;
4. extract reusable interaction and visual principles;
5. propose a coherent design system for this product;
6. redesign incrementally without breaking existing business logic, APIs, permissions, or workflows;
7. validate usability on Web, tablet, and mobile.

The desired product should feel like a modern **industrial operations platform**, not a legacy ERP interface.

For routine work, start with sections 1–3, then read the relevant module rules. Sections 36–40 define the delivery process; section 46 defines completion evidence. The remaining sections are reference checklists, applied to the affected workflow rather than repeated for every small change.

---

# 1. Product Context

QPM is the project's working product name. The first adaptation targets mining maintenance; construction (BTP) follows validation of the mining workflow. The shared foundation must remain reusable across sectors.

The reference pilot follows a conveyor through location and equipment identification, a request or planned intervention, qualification and assignment, technician execution, readings and parts consumption, then authorized completion and equipment history. Use [the conveyor pilot](PILOTE-MINE-CONVOYEUR.md) to anchor scenarios and role checks.

Keep client name, logo, colors, language, currency, and sector-specific fields configurable. The current brand is provisional. Reuse organization/deployment settings and verify existing permission and feature availability rules before exposing customization. Do not impose a single hierarchy, approval circuit, or mining vocabulary on every client.

For preventive maintenance, consult [the PM backlog](BACKLOG-MAINTENANCE-PREVENTIVE.md) and [strategy/multi-counter field scenarios](TESTS-PM-STRATEGIES-MULTICOMPTEURS.md). These documents contain evolving implementation and validation information; confirm the current code before treating a capability as available.

The product is an EAM/CMMS used to manage industrial maintenance operations. The following list describes possible areas, not a roadmap commitment.

Typical functional areas may include:

- Dashboard
- Work Requests
- Work Orders
- Planning & Scheduling
- Preventive Maintenance
- Assets / Equipment
- Functional Locations / Hierarchy
- Equipment 360
- Inspections / Checklists
- Meter Readings / Condition Monitoring
- Downtime / Failure information
- Spare Parts / Inventory
- Warehouses
- Purchasing / Procurement
- Vendors
- Contractors
- Teams / Technicians
- Documents / Attachments
- Notifications
- Reports / Analytics
- Administration
- Users / Roles / Permissions
- Settings

Agents must discover the **actual implemented modules** from the repository before assuming that this list exactly matches the application.

---

# 2. Core Design Principle

## Research → Understand → Compare → Design → Prototype → Validate → Implement

Never start by changing CSS.

Before redesigning a feature, understand:
- who uses it;
- what job they are trying to accomplish;
- what information is critical;
- what actions are frequent;
- what actions are dangerous or irreversible;
- what the current application already does;
- what backend/API constraints exist;
- what should be visible immediately versus progressively disclosed.

UI decisions must support operational work.

## 2.1 Proportionate scope and evidence

Classify the change before applying the workflow. Use the highest level triggered by the actual impact, not by the number of files changed.

| Level | Examples | Required preparation and evidence |
|---|---|---|
| Local correction | Label, spacing, overflow, feedback for an existing error | Inspect the affected component and behavior; reuse established patterns; verify the affected states and viewport. External research and new wireframes are optional. |
| Workflow improvement | Reorganizing a form, changing filters, clarifying a detail view | Inspect the complete affected journey and permissions; compare plausible alternatives using existing components or relevant references; document hierarchy, states, rationale, and before/after scenario results. |
| Major redesign | App navigation, a module's information architecture, shared visual foundations, a new cross-platform journey | Apply the full audit, research minimum in section 4.3, deliverables in section 36, prototype validation, and cross-platform checks. |

Reuse dated audits and research when they remain applicable. Explain why any requirement is not applicable. A local correction does not require a repository-wide inventory or five external references.

For workflow improvements and major redesigns, define a baseline and intended outcome before implementation: task success, interaction count, completion time, errors, or recovery behavior as relevant. Set thresholds for the selected scenario; do not invent a universal target for all screens.

---

# 3. Mandatory Existing-Application Audit

Before proposing a new UI, agents MUST inspect the existing project.

## 3.1 Repository audit

For the affected scope, identify:
- frontend framework and version;
- routing;
- state management;
- UI/component libraries;
- icon library;
- CSS strategy;
- typography;
- themes;
- authentication;
- authorization/roles;
- forms;
- tables;
- charts;
- notifications/toasts;
- dialogs/drawers;
- date/time controls;
- existing responsive behavior;
- API client architecture;
- backend endpoints consumed by each screen.

For this project, preserve the separation between the React frontend and Spring Boot backend unless the task explicitly requests an architectural change.

The repository baseline inspected on 2026-10-08 is:
- Web: React 17, TypeScript, MUI 5, Emotion, Redux Toolkit, React Router, Formik/Yup, and existing MUI themes.
- Native mobile: Expo 53, React Native 0.79, React 19, React Native Paper, React Navigation, Redux Toolkit, and AsyncStorage persistence.

Verify these against `frontend/package.json`, `mobile/package.json`, and actual usage before implementation. These are compatibility constraints, not instructions to upgrade dependencies. Distinguish responsive web verification from native Android/iOS verification.

## 3.2 Screen inventory

Build an inventory containing:

| Screen | Route | Primary User | Main Goal | Main Actions | Current Problems | Mobile Priority |
|---|---|---|---|---|---|---|

Do not redesign screens that have not been inspected.

## 3.3 Component inventory

Identify reusable existing components:
- buttons;
- inputs;
- selects;
- tables;
- cards;
- tabs;
- badges;
- status chips;
- pagination;
- filters;
- drawers;
- modals;
- breadcrumbs;
- navigation;
- forms;
- charts;
- empty states;
- loading states.

Determine which should be:
- kept;
- visually refactored;
- behaviorally improved;
- replaced;
- deprecated.

## 3.4 Existing UX problems

Explicitly look for:
- infinite loading/spinners;
- unclear loading state;
- failed API calls with no feedback;
- forms that silently fail;
- excessive modal usage;
- duplicated actions;
- inconsistent status names;
- inconsistent colors;
- unclear hierarchy;
- excessive table density;
- horizontal scrolling;
- poor mobile layout;
- tiny touch targets;
- actions hidden in menus;
- destructive actions too easy to trigger;
- lack of confirmation;
- lack of success/error feedback;
- confusing navigation;
- too many required fields;
- unclear field validation;
- pages that reload unnecessarily;
- information repeated across cards;
- dead ends;
- empty pages with no guidance.

Document these before implementation.

---

# 4. External UI/UX Research

Agents MUST research external references before major redesign work.

The purpose is inspiration and pattern discovery — **not cloning**.

## 4.1 Platforms to research

Search multiple sources where relevant:

### Design inspiration
- Dribbble
- Behance
- Mobbin
- Refero
- Land-book
- Awwwards
- Figma Community

### Design systems / interaction references
- Material Design
- Apple Human Interface Guidelines
- Microsoft Fluent
- IBM Carbon Design System
- Atlassian Design System
- Shopify Polaris
- Ant Design
- Radix UI
- shadcn/ui

### Adjacent product categories

Do not restrict research to CMMS products.

Search for excellent UX in:
- industrial operations;
- field service;
- asset management;
- fleet management;
- logistics;
- warehouse management;
- manufacturing;
- mining operations;
- IoT monitoring;
- inspection apps;
- healthcare operations;
- aviation maintenance;
- project management;
- workforce management;
- incident management;
- scheduling;
- inventory management;
- analytics platforms;
- modern B2B SaaS.

A maintenance scheduling screen may get better inspiration from workforce scheduling than from another CMMS.

An Equipment 360 screen may get better inspiration from IoT monitoring or fleet-management software.

## 4.2 Search by problem, not only product category

Use queries such as:

- enterprise dashboard UX
- industrial dashboard UI
- maintenance dashboard design
- field technician mobile app
- inspection mobile UX
- asset management dashboard
- equipment monitoring UI
- work order management UI
- work order detail UX
- scheduling board UI
- resource planning calendar UX
- kanban operations dashboard
- inventory management UI
- warehouse dashboard
- spare parts inventory UI
- procurement dashboard
- vendor management UI
- equipment detail page
- IoT asset detail dashboard
- technician workflow mobile
- checklist mobile UX
- offline field service UX
- responsive enterprise SaaS
- data table UX
- command palette SaaS
- enterprise search UX

Use synonyms and variations.

## 4.3 Minimum research standard

For a major redesign as defined in section 2.1:
- inspect at least 5 relevant references;
- use at least 2 different sources/platforms when possible;
- compare at least 3 viable patterns;
- identify why a pattern fits or does not fit the EAM workflow.

Do not select a design simply because it looks attractive.

For smaller changes, use the preparation required by section 2.1. Record unavailable references and use accessible alternatives; never claim to have inspected a source that could not be accessed. Distinguish portfolio concepts from documented interactions and observed production behavior.

---

# 5. Research Evidence

For each selected inspiration, record:

```text
Reference:
Source:
URL:
Screen / feature:
Pattern observed:
Why it is useful:
What should be adapted:
What should NOT be copied:
Desktop/mobile relevance:
Accessibility concerns:
```

When the environment supports screenshots, preserve useful references in project design documentation.

Never copy:
- logos;
- proprietary illustrations;
- copyrighted artwork;
- complete screen layouts pixel-for-pixel;
- another product's brand identity.

Extract principles and patterns instead.

---

# 6. User Roles

The interface must be designed according to roles, not only modules.

Potential roles include:

## Technician / Maintainer

Primary needs:
- see assigned work;
- understand priority;
- identify equipment;
- start work quickly;
- follow procedures/checklists;
- record time;
- record readings;
- consume spare parts;
- attach photos/documents;
- add notes;
- report findings/failures;
- complete/confirm work.

Design priorities:
- mobile first;
- minimal steps;
- large touch targets;
- clear primary action;
- strong offline behavior;
- limited administrative information.

## Supervisor

Primary needs:
- see team workload;
- assign/reassign;
- monitor execution;
- identify overdue/blocked work;
- validate/approve;
- inspect quality/completion.

Design priorities:
- situational awareness;
- exception-based management;
- fast filtering;
- mobile/tablet accessibility.

## Planner

Primary needs:
- backlog;
- priorities;
- scheduling;
- resource capacity;
- preventive jobs;
- dependencies;
- materials readiness;
- work-center/team allocation.

Design priorities:
- desktop first;
- high information density without clutter;
- scheduling/calendar/board views;
- batch actions;
- filters;
- saved views.

## Reliability / Maintenance Engineer

Primary needs:
- equipment history;
- failure analysis;
- downtime;
- PM effectiveness;
- condition monitoring;
- maintenance strategy;
- trends.

Design priorities:
- Equipment 360;
- history/timeline;
- analytics;
- drill-down.

## Store / Procurement

Primary needs:
- stock;
- reservations;
- shortages;
- reorder;
- purchase requests;
- vendors;
- material availability.

## Administrator

Primary needs:
- configuration;
- users;
- roles;
- permissions;
- master data.

Administrative complexity must not leak into technician workflows.

---

# 7. Web vs Mobile

Do NOT build the desktop application and merely shrink it.

Web and mobile share a design system, but they may have different information architecture.

## Web

Optimized for:
- planners;
- supervisors;
- engineers;
- administrators;
- inventory/procurement users.

Patterns:
- sidebar navigation;
- global search;
- breadcrumbs where useful;
- data tables;
- advanced filters;
- saved views;
- calendar;
- Kanban;
- workload/capacity boards;
- split views;
- side drawers;
- bulk actions;
- keyboard shortcuts when useful.

## Mobile

Optimized primarily for:
- technicians;
- supervisors in the field;
- inspections;
- equipment scanning;
- quick requests.

Patterns:
- bottom navigation;
- contextual top bar;
- cards instead of dense tables;
- sticky primary action;
- step-by-step forms;
- camera;
- QR/barcode scanning;
- offline state;
- synchronization indicator;
- large touch targets;
- minimal typing.

Avoid transferring complex desktop tables directly to mobile.

---

# 8. Information Architecture

The navigation must follow users' mental model.

Evaluate a structure similar to:

```text
Home
Work
  Work Requests
  Work Orders
  Planning & Scheduling
Maintenance
  Preventive Maintenance
  Inspections
Assets
  Equipment
  Locations
  Equipment 360
Materials
  Parts
  Inventory
  Warehouses
Procurement
  Purchase Requests
  Vendors
People
  Teams
  Contractors
Analytics
Administration
```

This is a starting hypothesis only.

Agents must compare it with the actual application's features and workflows before adoption.

Navigation rules:
- keep top-level categories limited;
- avoid duplicate destinations;
- avoid exposing internal technical terminology when a clearer business term exists;
- maintain consistent placement;
- support breadcrumbs for deep hierarchies;
- preserve context when navigating back;
- support deep links.

---

# 9. Dashboard Philosophy

A dashboard is not a collection of decorative charts.

Every card should answer:
- What happened?
- Does it require attention?
- What can the user do next?

Prioritize:
- actionable exceptions;
- overdue work;
- critical equipment;
- PM due;
- team workload;
- schedule compliance;
- blocked work;
- material shortages;
- important alerts.

Avoid:
- redundant KPI cards;
- charts with no operational decision;
- excessive colors;
- large decorative illustrations occupying operational space.

Every KPI should support drill-down when technically possible.

---

# 10. Work Order UX

Work Orders are a core workflow.

Support useful views where relevant:
- List
- Table
- Kanban
- Calendar
- Schedule
- My Work

## Work Order card/list item

Prioritize:
1. WO identifier;
2. title/description;
3. asset;
4. priority;
5. status;
6. due/scheduled time;
7. assigned person/team;
8. relevant blockers.

Do not display every database field in list views.

## Work Order detail

Potential structure:

```text
Header
- WO number
- title
- status
- priority
- asset
- primary action

Tabs / sections
- Overview
- Tasks / Checklist
- Labor / Time
- Parts
- Attachments
- Readings
- Failure / Downtime
- Comments
- History
```

Primary actions must be contextual:
- Start
- Pause
- Resume
- Complete
- Approve
- Reopen

Do not show actions the current status or role cannot perform.

---

# 11. Equipment 360

Equipment 360 should become one of the strongest experiences in the product.

Potential structure:

```text
Equipment
├── Overview
├── Health / Condition
├── Work Orders
├── Preventive Maintenance
├── Inspections
├── Downtime / Failures
├── Spare Parts
├── Documents
├── Meter Readings
└── History
```

Header should quickly communicate:
- equipment name;
- equipment ID;
- location;
- operational status;
- criticality;
- health/condition where available;
- open critical work;
- next PM.

Avoid overwhelming users with all history at once.

Use progressive disclosure and drill-down.

---

# 12. Planning & Scheduling

Research planning UX independently.

Evaluate:
- calendar;
- timeline;
- Gantt-like scheduling;
- resource lanes;
- team/work-center lanes;
- drag and drop;
- unscheduled backlog;
- planned workload vs capacity;
- conflicts;
- material readiness;
- frozen schedule;
- priority.

A planner should be able to understand:
- what is planned;
- what is not scheduled;
- who is overloaded;
- what is blocked;
- what changed;
- what is overdue.

Drag-and-drop must not be the only way to schedule.

All changes need accessible alternatives.

---

# 13. Preventive Maintenance

## 13.1 Distinct mechanisms

Use explicit labels and explanations for the mechanisms supported by the current API:

| Mechanism | Information to expose |
|---|---|
| Calendar plan | Cadence, company timezone, start/end, scheduled-date or completion-date basis, and generation lead time. |
| Single-meter cycle | Equipment meter, unit, reference reading, interval, next threshold, and optional end value. |
| Threshold alarm | Threshold direction, recurrence/rearming, and delay. Keep this separate from recurring PM cycles. |
| Strategy with packages | Base cycle, package multiples, package codes, and assigned tasks. |
| Multi-counter plan | Meter and unit per cycle, reference/interval/end, cycle tasks, and explicit AND/OR combination. |

Advanced controls should be progressively disclosed. Preserve values and validation feedback when editing configuration. Do not present unsupported calendar+meter combinations as available, or estimate a meter due date without a supported usage-rate model.

## 13.2 Plan, occurrence, and work order

Keep these concepts distinct:
- the plan defines recurrence and the work template;
- an occurrence records a planned date or threshold and its execution history;
- a generated work order has its own due date, status, assignments, and execution lifecycle.

Generation time, occurrence date, and work-order due date must have separate labels. A forecast is not proof of generation. Calendar forecasts based on completion must state their assumptions; meter forecasts must retain their units.

Map occurrence states from the API (`PLANNED`, `DUE`, `RESCHEDULED`, `GENERATED`, `COMPLETED`, `IGNORED`) to consistent localized labels. Do not reuse work-order status labels as if they describe the same lifecycle. Preserve links to the originating reading and generated order where available.

For a reschedule, show the previous/new date, reason, and actor when provided by the API. Explain whether the action moves one occurrence or changes the plan cadence. Never imply that a one-off reschedule shifts the entire plan.

## 13.3 Roles and validation

Keep plan creation and advanced configuration on the web while the native mobile scope remains consultation of plans, occurrences, and linked orders. Follow actual permissions; do not add a closure prerequisite or catch-up policy as a UI assumption.

Validate a planner scenario (configure, inspect the forecast/register, and reschedule where authorized) and a technician scenario (inspect upcoming work, open the linked order, and record execution where authorized). Include denied actions, units, timezone behavior, and preservation of history. Use the PM field guide for strategy and multi-counter edge cases.

---

# 14. Inventory & Spare Parts

Design around operational questions:

- Is the part available?
- Where is it?
- How many are available?
- Is stock below minimum?
- Is it reserved?
- Is it on order?
- Which assets use it?
- What was recent consumption?

Part detail may contain:
- part number;
- description;
- image;
- stock status;
- quantity;
- min/max;
- warehouse/bin;
- compatible assets;
- open orders;
- usage history.

Use clear stock-state indicators, not color alone.

---

# 15. Forms

Forms must be optimized for task completion.

Rules:
- group related fields;
- show required fields clearly;
- use sensible defaults;
- prefill known information;
- hide irrelevant fields;
- progressive disclosure for advanced options;
- inline validation;
- preserve entered data after validation errors;
- prevent accidental duplicate submissions;
- show submission progress;
- clearly distinguish Create / Save Draft / Submit / Cancel;
- disable actions only with an understandable reason;
- warn before losing unsaved changes.

Long forms should use sections or steps when appropriate.

Do not make every backend field visible.

---

# 16. Tables

Enterprise tables must be usable, not merely compact.

Support as appropriate:
- search;
- filters;
- sorting;
- pagination or virtualization;
- column visibility;
- sticky header;
- row selection;
- batch actions;
- saved views;
- export;
- density control.

Avoid:
- action buttons in every cell;
- excessive columns;
- horizontal scrolling as default;
- color-only statuses.

Use row click carefully. Interactive controls inside rows must remain predictable.

---

# 17. Search & Filters

Provide a consistent filtering language.

Filters should:
- show active state;
- be removable individually;
- support Clear All;
- persist when returning to a page when useful;
- support shareable URL state where feasible;
- not reset unexpectedly.

Consider global search for:
- WO;
- equipment;
- functional location;
- part;
- person/team;
- vendor.

---

# 18. Status System

Create a controlled semantic status system.

Examples of semantic categories:

- Neutral
- Information
- Planned
- In Progress
- Success / Completed
- Warning
- Critical
- Blocked
- Cancelled / Inactive

Never rely on color alone.

Use:
- text;
- icon when useful;
- shape/badge;
- color.

The same business status must look the same everywhere.

Maintain a mapping per domain status: API value, localized label, semantic token, optional icon, and supported actions by role. Semantic categories are presentation roles, not replacement domain enums. Different lifecycles (equipment, work orders, PM occurrences) may use different labels while sharing the same warning or completion tokens.

Avoid random colors per module.

---

# 19. Visual Design System

Agents must define reusable design tokens.

## Integration with the existing UI libraries

Extend the existing MUI theme and component overrides for the web (`frontend/src/theme/`), and the React Native Paper theme for native mobile (`mobile/custom-theme.ts`). Reuse shared form and layout components before creating replacements. Adding another component library requires a documented need within the authorized task scope.

Share semantic color roles, terminology, status meaning, typography hierarchy, and spacing principles. Adapt these to each platform's interaction and accessibility conventions; identical component implementations are not required. Keep configuration-driven client branding separate from warning, error, and success semantics.

For each token family or component changed, record the existing value/behavior, proposed value/behavior, affected screens, web/mobile mapping, and validation result. Start with the pilot screens before changing global defaults across the application.

## Typography

Choose a highly legible UI typeface available legally in the project.

Define:
- display;
- H1/H2/H3;
- body;
- small;
- label;
- caption;
- numeric/KPI style.

Avoid too many font sizes.

## Spacing

Use a consistent spacing scale.

Example:
4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48

## Radius

Use a limited radius scale.

Do not make every element excessively rounded.

## Shadows

Use shadows sparingly.

Prefer:
- spacing;
- background contrast;
- borders;
- elevation only where meaningful.

## Icons

Use one icon family consistently.

Icons must support meaning, not decoration.

## Color

Define:
- brand;
- background;
- surface;
- text primary;
- text secondary;
- border;
- focus;
- semantic colors.

Do not hardcode colors repeatedly in components.

Use tokens.

---

# 20. Dark Mode

Do not assume dark mode is automatically needed.

If implemented:
- use semantic tokens;
- preserve contrast;
- test charts;
- test status colors;
- test disabled states;
- test tables;
- test overlays;
- test photographs/documents.

Industrial usage may involve bright outdoor environments, so light mode must remain excellent.

---

# 21. Responsive Design

Define breakpoints based on content behavior, not device names alone.

Test at minimum:
- small mobile;
- large mobile;
- tablet portrait;
- tablet landscape;
- laptop;
- desktop;
- large desktop.

For each major screen decide:
- what remains visible;
- what collapses;
- what moves into a drawer;
- what becomes cards;
- what becomes horizontally scrollable only as last resort;
- which actions remain sticky.

---

# 22. Accessibility

Accessibility is mandatory.

Target WCAG 2.2 AA where feasible.

Check:
- text contrast;
- focus visibility;
- keyboard navigation;
- semantic HTML;
- labels;
- screen reader names;
- dialog focus trapping;
- error association;
- touch target sizes;
- status meaning without color;
- reduced motion;
- zoom;
- responsive text;
- accessible charts.

Do not remove focus outlines unless replaced by a visible accessible focus style.

---

# 23. Loading States

Avoid indefinite generic spinners.

Use:
- skeletons for structured content;
- inline progress for actions;
- explicit loading messages for long operations;
- optimistic updates only when safe.

A user must know whether:
- data is loading;
- an action is processing;
- synchronization is pending;
- the request failed.

---

# 24. Empty States

Every important empty state should explain:
- what is empty;
- why it might be empty;
- what the user can do next.

Examples:
- no work assigned;
- no search result;
- no spare parts;
- no PM history;
- no data because filters are active.

Do not show blank white screens.

---

# 25. Error States

Design errors intentionally.

Differentiate:
- validation error;
- network error;
- server error;
- permission denied;
- not found;
- conflict;
- offline;
- timeout;
- synchronization failure.

Provide recovery actions when possible:
- Retry
- Edit
- Go back
- Contact administrator
- Save locally
- View conflict

Never silently swallow API errors.

---

# 26. Offline & Synchronization

Field maintenance may occur with unreliable connectivity.

When applicable, design for:
- offline indication;
- locally cached assigned work;
- locally stored drafts;
- queued actions;
- queued photos;
- sync progress;
- last synchronized time;
- conflicts;
- failed sync retry.

Never make users believe an operation reached the server when it is only stored locally.

## 26.1 Capability boundary

The inspected mobile code persists Redux state through AsyncStorage and detects connectivity in some screens. Persistence and connectivity detection alone do not prove support for queued writes, attachment upload retries, or conflict resolution. Audit the actual behavior before exposing those actions.

For each affected operation, record its supported offline behavior:

| Operation | Questions to resolve before presenting it as available |
|---|---|
| Read assigned work | What is cached, for which user/company, and how is its age shown? |
| Save a draft | Where does it survive restart, how is it recovered, and what happens on account change? |
| Submit readings, time, parts, or completion | Is submission online-only or durably queued? How are retries deduplicated and permissions revalidated? |
| Attach photos/documents | Are files retained until confirmed upload? What are the limits and recovery actions? |
| Synchronize | Which server confirmation clears a pending action? How are conflicts and failed actions resolved? |

If an operation requires connectivity, explain that before submission and preserve input where supported. Do not promise local saving or automatic retry without implementation evidence. For supported offline writes, distinguish local draft, pending submission, confirmed save, and failure in user-facing feedback.

Adding a durable write queue or a conflict policy is a functional change with storage/API implications. Treat it as a separately scoped implementation, not an incidental visual adjustment. Verify account/company boundaries and recovery after application restart when offline storage is involved.

---

# 27. Feedback & Notifications

Use feedback according to importance.

Toast:
- lightweight confirmation.

Inline message:
- validation or contextual problem.

Banner:
- page/system-level state.

Modal:
- only when interruption is necessary.

Avoid excessive success toasts for trivial actions.

---

# 28. Destructive Actions

For delete, cancel, close, reject, archive, or irreversible operations:
- communicate consequences;
- require confirmation where appropriate;
- use explicit button labels;
- avoid ambiguous "Yes/No";
- require reason when business rules demand it;
- support undo when technically safe.

Example:

Bad:
`Are you sure? [Yes] [No]`

Better:
`Cancel Work Order WO-10542? [Keep Work Order] [Cancel Work Order]`

---

# 29. Motion & Animation

Motion should explain state change.

Use subtle animation for:
- drawer transitions;
- expanding sections;
- drag/drop feedback;
- loading transitions;
- success state.

Avoid:
- decorative constant movement;
- long page transitions;
- animations delaying task execution.

Support reduced motion.

---

# 30. Performance as UX

A beautiful slow interface is a poor interface.

Agents must monitor:
- bundle size;
- initial load;
- unnecessary API requests;
- duplicate fetches;
- infinite request loops;
- rendering large tables;
- expensive charts;
- image size;
- unnecessary re-renders.

Use:
- lazy loading;
- route-level splitting;
- caching;
- pagination/virtualization;
- image optimization;
- request cancellation where appropriate.

Do not hide performance bugs behind skeleton loaders.

---

# 31. Security & Permissions in UX

The frontend must respect backend authorization.

UI rules:
- hide or disable actions users cannot perform as appropriate;
- never rely on frontend permissions for actual security;
- clearly communicate read-only state;
- do not expose sensitive admin data unnecessarily;
- avoid leaking internal identifiers unless useful;
- protect destructive operations.

---

# 32. Data Visualization

Charts must answer business questions.

Before adding a chart, state:
- question;
- metric;
- dimension;
- period;
- action supported.

Prefer:
- bar charts for comparison;
- line charts for trends;
- stacked bars carefully for composition;
- tables when exact values matter;
- KPI + sparkline for compact trend context.

Avoid:
- 3D charts;
- decorative gauges;
- excessive donut charts;
- rainbow palettes.

Always include:
- units;
- period;
- meaningful labels;
- tooltips;
- empty/error state.

---

# 33. Industrial Context

The product may be used in workshops, plants, mines, warehouses, and field environments.

Account for:
- gloves;
- dust;
- sunlight;
- noisy environments;
- unstable network;
- mobile devices;
- tablets;
- users standing or walking;
- fast shift handovers;
- safety-critical information.

Field UI should favor:
- high legibility;
- strong contrast;
- large controls;
- short interactions;
- clear status;
- camera/scan input;
- minimal typing.

---

# 34. Internationalization

Design components so text expansion does not break layouts.

Avoid fixed widths based on English labels.

If multiple languages are supported:
- externalize strings;
- avoid text embedded in images;
- format dates/numbers according to locale;
- allow longer translations;
- keep terminology consistent.

For affected web components, preserve the existing direction-aware theme behavior and check right-to-left layout where relevant. Check native mobile separately. Use a consistent localized glossary for plan, occurrence, threshold, reading, equipment, and work-order statuses.

---

# 35. Dates, Times & Units

Industrial maintenance depends on precise time information.

Always clarify:
- date;
- start time;
- finish time;
- duration;
- timezone when relevant.

Avoid ambiguous date formats.

Use unit labels consistently:
- h
- min
- km
- °C
- bar
- mm
etc.

Do not store display-formatted values as domain values.

---

# 36. Design Deliverables Before Implementation

For each major redesigned module, produce:

Use section 2.1 for local corrections and workflow improvements; the full deliverable set below applies to major redesigns. Existing evidence can be referenced instead of duplicated.

## A. Current-state audit
- screenshots or routes;
- current workflow;
- problems;
- technical constraints.

## B. Research board
- references;
- links;
- extracted patterns;
- rationale.

## C. UX proposal
- target users;
- user journey;
- information hierarchy;
- actions;
- states.

## D. Wireframe
Focus on structure before visual polish.

## E. High-fidelity direction
Define:
- typography;
- spacing;
- colors;
- components;
- interaction.

## F. State matrix

Document:
- default;
- hover;
- focus;
- selected;
- disabled;
- loading;
- empty;
- error;
- offline;
- success;
- permission denied.

## G. Responsive behavior
Document desktop/tablet/mobile differences.

## H. Scenario and prototype validation

Define representative tasks, roles, starting data, and expected results. Record the current baseline and target outcome, then exercise the proposed prototype before implementing a major flow. Include a technician and a responsible/planner scenario when both roles are affected.

For each scenario, record success/failure, interaction count or completion time when useful, observed errors, and recovery behavior. Validate with representative users when available; label internal walkthroughs as internal evidence. Record unavailable field/device validation as pending, with a concrete next check. Do not report usability improvement or native-device success without supporting evidence.

Only then proceed to implementation for major flows within the authorized scope. A pending field trial must remain visible in the delivery record; it is not a reason to stop independently authorized preparation or local verification.

---

# 37. Agent Decision Framework

For major redesign alternatives, score each option from 1–5 and explain scores using the selected scenarios. For smaller changes, a concise rationale is sufficient.

| Criterion | Weight |
|---|---:|
| Task efficiency | 5 |
| Clarity | 5 |
| Industrial usability | 5 |
| Mobile usability | 4 |
| Accessibility | 4 |
| Consistency | 4 |
| Technical feasibility | 4 |
| Information density | 3 |
| Visual quality | 3 |
| Originality / brand fit | 2 |

Do not select the visually prettiest concept if it performs worse operationally.

Accessibility, supported business behavior, and authorization are acceptance requirements; a weighted score cannot compensate for a failure in those areas. Adjust role-dependent weights explicitly when the target workflow is desktop planning rather than field execution.

---

# 38. Implementation Rules

Agents must:

1. preserve business logic unless explicitly asked to change it;
2. preserve API contracts unless a coordinated backend change is approved;
3. reuse components;
4. avoid page-specific hardcoded styling when a design token/component is appropriate;
5. keep accessibility intact;
6. add or update tests where behavior changes;
7. verify responsive layouts;
8. verify loading/error/empty states;
9. avoid broad unrelated refactors;
10. document significant design decisions.

Before deleting existing functionality, prove it is obsolete or receive explicit approval.

---

# 39. Incremental Redesign Strategy

Do not redesign the entire application in one uncontrolled pass.

For QPM, prioritize the authorized pilot scope and observed friction:

1. Audit the conveyor workflow and PM configuration/register; record the baseline and affected roles.
2. Establish the minimum shared tokens and components needed by these screens.
3. Improve the selected PM planner and mobile technician journeys incrementally, preserving current functional limits.
4. Validate the pilot, then extend proven patterns to equipment detail, work orders, and related modules.

App-shell changes follow evidence of navigation problems; a dashboard redesign is not a prerequisite for improving PM or the technician journey.

For broader application redesign, the following sequence is a reference, adjusted to actual dependencies and priorities:

1. Foundations / design tokens
2. App shell / navigation
3. Buttons, forms, badges, dialogs, drawers
4. Tables / filtering / search
5. Dashboard
6. Work Orders
7. Work Order Detail
8. Mobile technician workflow
9. Equipment / Equipment 360
10. Planning & Scheduling
11. Preventive Maintenance
12. Inventory / Spare Parts
13. Procurement / Vendors
14. Teams / Contractors
15. Reports / Analytics
16. Administration
17. Cross-module consistency audit

After each stage:
- test;
- review;
- compare against `docs/design.md` and the applicable product/pilot documents;
- fix regressions.

---

# 40. Recommended Research Approach Per Screen

For a major redesign, execute this workflow. For local corrections and workflow improvements, scale preparation and evidence according to section 2.1.

```text
1. Inspect current route/component/API.
2. Identify target user and job-to-be-done.
3. Identify usability problems, the baseline, and scenario acceptance criteria.
4. Search 5+ relevant UI/UX references.
5. Compare 3+ patterns.
6. Extract useful principles.
7. Reject patterns that conflict with industrial use.
8. Create wireframe/information hierarchy.
9. Map all UI states.
10. Check desktop/mobile/tablet.
11. Check accessibility.
12. Check API/technical feasibility and supported offline capabilities.
13. Exercise a prototype with representative scenarios and record the results.
14. Implement with reusable components within the authorized scope.
15. Test behavior, role restrictions, recovery states, and responsiveness.
16. Review against the acceptance criteria and record remaining field/device checks.
```

---

# 41. Anti-Patterns — Do Not Do This

Agents must NOT:

- blindly copy Dribbble shots;
- redesign without inspecting existing behavior;
- prioritize visual novelty over usability;
- create a different design language for every module;
- use gradients everywhere;
- use glassmorphism where it reduces readability;
- overuse shadows;
- over-round every container;
- create enormous dashboard cards with little information;
- use icons without labels for unfamiliar actions;
- make mobile a scaled-down desktop;
- hide critical actions behind multiple menus;
- use color as the only status indicator;
- show endless spinners;
- silently ignore API failures;
- place every action in a modal;
- introduce animations that slow work;
- change backend behavior merely to fit a visual concept;
- replace working functionality without regression testing.

---

# 42. Design Review Checklist

Before considering a screen complete, answer:

### User
- Who is this screen for?
- What is their primary task?
- Is the primary action obvious?

### Information
- Is the most important information first?
- Is anything unnecessary competing for attention?
- Can the user scan the screen quickly?

### Interaction
- Are actions predictable?
- Is feedback immediate?
- Can errors be recovered from?

### States
- Loading?
- Empty?
- Error?
- Offline?
- Disabled?
- Permission denied?
- Success?
- Partial data?

### Responsive
- Mobile?
- Tablet?
- Laptop?
- Large screen?

### Accessibility
- Keyboard?
- Focus?
- Contrast?
- Labels?
- Touch targets?
- Status without color?

### Technical
- API calls stable?
- No request loop?
- No console error?
- No layout shift?
- Reasonable performance?

Use the scenario's agreed thresholds and record measurements where performance is affected. Screenshots show layout; they do not prove API stability, accessibility, or native-device behavior.

### Consistency
- Uses design tokens?
- Uses shared components?
- Same status representation?
- Same terminology?

If any major answer is "no", the design is not complete.

---

# 43. Expected Research Output Format

When asked to research a module, agents should return:

```markdown
# UI/UX Research — [Module]

## 1. Current State
...

## 2. Users & Jobs
...

## 3. Problems
...

## 4. External References

### Reference 1
- Source:
- URL:
- Pattern:
- Strength:
- Weakness:
- Relevant idea:

...

## 5. Pattern Comparison
...

## 6. Recommended Direction
...

## 7. Information Architecture
...

## 8. Desktop UX
...

## 9. Mobile UX
...

## 10. States
...

## 11. Accessibility
...

## 12. Technical Constraints
...

## 13. Proposed Components
...

## 14. Implementation Plan
...
```

---

# 44. Final Product Vision

The final interface should communicate:

**Reliable**
- Users trust what they see and what the system saved.

**Fast**
- Frequent maintenance actions require few interactions.

**Industrial**
- Designed for real operations, not just portfolio screenshots.

**Clear**
- Priorities, equipment status, work status, and next actions are obvious.

**Modern**
- Contemporary enterprise UX without fashion-driven excess.

**Consistent**
- Web and mobile feel like the same product.

**Role-aware**
- Technicians, planners, supervisors, engineers, stores, procurement, and administrators see interfaces optimized for their jobs.

**Resilient**
- Loading, network failure, offline operation, errors, permissions, and synchronization are first-class design states.

**Scalable**
- New EAM modules can reuse the same navigation, components, tokens, and interaction patterns.

---

# 45. Primary Instruction to Every Design Agent

> Do not begin by asking "How can I make this screen prettier?"
>
> Begin with:
>
> **Who is using this screen, what maintenance decision or action are they trying to complete, what currently makes that difficult, and which proven UI/UX patterns can reduce that friction?**
>
> Research broadly, reason from the workflow, adapt rather than copy, preserve business logic, design all states, validate across Web and mobile, and implement through a coherent reusable design system.

---

# 46. Definition of Done

A UI/UX task is done only when:

- the scope level from section 2.1 and affected routes/components are recorded;
- existing behavior, permissions, and API dependencies were understood;
- preparation/research matches that scope level, with a rationale for the choice;
- affected scenarios meet their acceptance criteria, with before/after evidence for workflow improvements and major redesigns;
- the relevant responsive web and native mobile checks are distinguished and recorded;
- affected keyboard/focus, labels, error association, contrast, and touch interactions were checked using methods appropriate to the platform;
- loading, empty, error, denied, and offline states are verified where applicable; unsupported capabilities are explained rather than simulated;
- existing shared components and theme tokens are reused or any new reusable components are documented;
- business rules and API contracts are preserved, or changes are explicitly within the coordinated task scope;
- appropriate behavior tests and layout checks pass, with commands/manual steps and results recorded;
- the affected workflow has no known blocking regression;
- pending field trials or device checks are explicitly identified and not reported as successful.

Record the evidence in the task result or scoped design document:

| Scenario | Role/platform | Starting state | Expected outcome | Observed outcome/evidence | Result |
|---|---|---|---|---|---|
| Read an assigned order | Authorized technician / native mobile | Assigned order available | Equipment, priority, and permitted primary action are clear | Record device or simulator and observations | Pass / fail / pending |
| Submit a reading after a network error | Authorized technician / affected client | Reading entered; server unreachable | No false saved confirmation; value remains recoverable in the tested session; retry follows supported behavior | Record failure and recovery steps; check restart only if supported | Pass / fail / pending |
| Inspect or reschedule a PM occurrence | Authorized planner / web | Plan and occurrence available | Units/dates are clear; one-off reschedule preserves cadence and shows its audit when supported | Record before/after occurrence and linked order evidence | Pass / fail / pending |
| Attempt a restricted action | User without the required permission / affected client | Target entity available | UI respects permissions and the API enforces authorization | Record UI behavior and API response without sensitive data | Pass / fail / pending |

Adapt these examples to the task; they are not mandatory tests for an unrelated local correction. A task requiring field validation remains pending that validation. Local implementation completion may be reported separately, with its actual evidence and limits.

**A polished screenshot alone is never the definition of done.**
