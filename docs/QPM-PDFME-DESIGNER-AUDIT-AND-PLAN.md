# QPM PDFme Designer — repository audit and implementation plan

**Date:** 2026-10-23
**Scope:** Work Order templates only. This is the read-only audit and plan preceding application changes.

## 1. Repository audit

### Web application

- The production web frontend is under `frontend/`. Its package manifest declares React **17.0.2**, Material UI **5.8.2**, React Router **6.3.0**, TypeScript, and a `react-app-rewired` build. A committed `frontend/package-lock.json` is present. The existing application uses MUI, its existing theme, the shared `api` client, authenticated user/permission context, i18n, and snackbar feedback.
- Report Management is already routed below Settings. `frontend/src/router/app.tsx` has `settings/documents` and `settings/documents/:id/designer`. `DocumentTemplates.tsx` lists and manages templates, versions, preview and publishing. The current designer file is `frontend/src/content/own/Settings/Documents/DocumentDesigner.tsx`; it is a QPM-owned field/section editor, not pdfme.
- The current working tree already contains broad uncommitted changes, including the current designer, report research, document backlog, and related backend work. This audit does not discard or overwrite those changes. Implementation must preserve them and scope edits to the Report Management integration.

### Spring Boot and data model

- The API is Spring Boot **3.5.16** on Java **17**, with Spring Data JPA, PostgreSQL, Liquibase, Jackson, iText **9.6.0**, html2pdf **6.3.2**, and Thymeleaf.
- `DocumentTemplate.configuration` content is stored as JSONB in `DocumentTemplateVersion.configuration`. `DocumentTemplate` already has an `engine` field, currently initialized to `QPM_NATIVE`. Published version snapshots are immutable; draft editing, publishing, version history, company ownership and optimistic locking already exist.
- Existing Liquibase changelog `api/src/main/resources/db/changelog/2026_10_22_00000000001_document_templates.xml` creates the template/version tables, JSONB configuration, version relationships, tenant uniqueness, and immutability protection. No new persistence model is needed for pdfme template JSON.
- The existing APIs are in `DocumentTemplateController` and `GeneratedDocumentController`: list/types, create/update, versions, publish/archive, authorized data/PDF preview, issue, list and download. They already use the authenticated user and company-scoped service lookups.
- `DocumentTemplateService` validates the QPM schema (currently versions `1.0` and `2.0`) and writes `QPM_NATIVE` on creation. `ReportTemplateConfigurationValidator` rejects other root/schema shapes. `GeneratedDocumentService.renderTemplate` resolves values through allowlisted `DocumentDataProvider`s and then calls `ConfigurableWorkOrderReportRenderer`.
- `WorkOrderReportDataProvider` resolves Work Order, company, equipment/location, task, labor/time, material, completion, feedback and signature data. It filters related records to the Work Order's company. Report preview checks company access and `canBeViewedBy`; report issuance additionally checks `canIssueReportBy`. These checks must remain authoritative.
- Current generated documents are stored through the existing storage abstraction with company/source metadata, SHA-256, issuer, immutable template version reference, locale and render snapshot.

### Current implementation boundary

There is **no pdfme dependency** in the frontend or API. The current web designer serializes the QPM `schemaVersion: 2.0` layout, which the Java renderer interprets as sections, fields and fixed table types. A pdfme `Template` uses a different `basePdf` plus page schemas format. Saving a pdfme object into the current API unchanged would fail validation; allowing it without changing rendering would also make saved templates impossible to preview or issue through the current endpoints.

## 2. pdfme feasibility findings

The official pdfme documentation describes `@pdfme/ui` as a standalone bundle exposing an imperative `Designer` class, so it does not require a React integration or a newer React peer runtime just to render the editor. React 17 can host it through a `ref` DOM mount with deterministic `destroy()` cleanup. This is a promising compatibility path, but the actual QPM Webpack production build remains a required verification gate before adoption.

pdfme's template is JSON with `basePdf` and per-page `schemas`. It supports a visual canvas, drag/move/resize, text styles, images, custom fonts, tables, and plugins. Dynamic tables support variable rows and automatic page breaks when `basePdf` is a blank dimension/padding object. A fixed uploaded PDF base preserves its fixed pages and does not provide dynamic layout/page-break behavior. A4 portrait/landscape can be represented with millimetre dimensions (210×297 / 297×210). Custom font bytes/URLs are supported by its Designer and generator.

pdfme does **not** provide a Spring/Java generator. The current QPM iText renderer cannot execute pdfme schemas. Generating an official PDF only in the browser and posting the PDF back would let an untrusted client submit an arbitrary document as an issued Work Order. That does not meet the existing audit/security model. The safe design is to keep authorization, Work Order data resolution, version checks, and artifact issuance in Spring, and use an internal renderer process/service for the pdfme generation. That renderer must have no public route, must not receive database credentials, must only receive validated templates and server-resolved values, and must be protected by service-to-service authentication and bounded request sizes/timeouts.

The frontend must also constrain Designer plugins and template schemas to the components QPM supports. Arbitrary custom JavaScript plugins, user-provided base-PDF URLs, remote image fetching, formulas/expressions, and arbitrary data binding are outside the first release because they expand the execution, SSRF, and data-exposure surfaces.

### Supported in the Work Order pilot

- Visual page canvas and editable/movable/resizable elements.
- Text, company logo/image, dividers/shapes, tables, and signature/image fields.
- Page size/orientation A4 portrait and landscape.
- Dynamic Work Order values provided by QPM's allowlisted provider.
- Dynamic task/labor/material tables with long-table page breaks on a blank pdfme page.
- Existing draft/publish/version history and tenant authorization.

### Constraints or not included in the pilot

- No conversion of existing QPM_NATIVE templates to pdfme without an explicit migration and visual comparison. Existing templates remain readable and render through the existing engine.
- No arbitrary SQL, expressions, web URLs as data bindings, custom plugin code, direct browser artifact issuance, or public renderer endpoint.
- Uploaded custom background PDFs cannot be combined with pdfme's automatic dynamic page reflow. The pilot will use pdfme's blank A4 base and compose branding/layout as editable schemas.
- PDF parity is not demonstrated by a successful JS compile. The same template/data must be rendered by the Designer preview and server generation, then inspected as an actual PDF.
- Official pdfme docs establish table, image, fonts, and page-break capabilities. QPM still must verify the exact installed-version behavior and browser compatibility in its React 17/Webpack build.

## 3. Plan-first implementation sequence

### Phase A — audit gate (completed before application edits)

Record current components, routes, API contracts, JSONB/version model, tenant permissions, renderer and dependencies. Keep the existing dirty working tree intact.

### Phase B — dependency and proof of compatibility

1. Pin pdfme **6.2.8** for `@pdfme/common`, `@pdfme/ui`, `@pdfme/generator`, and `@pdfme/schemas`; React/MUI were not upgraded.
2. Mount the standalone `@pdfme/ui` Designer imperatively in the existing Document Designer route, with teardown on unmount.
3. A real React 17 production build and browser interaction check remain required; the current build process exits early under memory pressure in this environment.

### Phase C — additive engine support

1. Preserve `QPM_NATIVE` as the default and existing rendering path.
2. Add an explicit `PDFME` engine path for new Work Order templates, with a strict server-side schema validator and allowlisted data names. Do not accept arbitrary plugin code or arbitrary remote resources.
3. Reuse JSONB draft/published version rows; keep existing immutable published snapshots and document snapshots.
4. Keep all API write and preview/issue authorization in Spring. Add a private renderer adapter and service authentication; renderer receives only a validated template plus the value map resolved by the authorized provider.
5. Keep REQUEST and other document types on their existing path until the Work Order prototype passes acceptance.

### Phase D — Work Order designer and template

1. Replace the current QPM field-ordering editor as the primary Work Order authoring surface with the pdfme Designer mounted in the existing route; retain the template list, existing permissions, and save/publish/version controls.
2. Provide a QPM Job Card starter template using existing fields for company identity, Work Order identification, equipment/location, operations, labor, materials, instructions/notes and signatures. Clearly mark unavailable fields and never synthesize values.
3. Add authorized draft preview using a representative Work Order; preview and server issue must render from the same pdfme template and allowlisted data snapshot.
4. Preserve legacy QPM_NATIVE templates as-is and keep a clear engine-specific editing/preview path.

### Phase E — validation gate

- Frontend: React 17 mount/dispose, save/reopen, editing, page dimensions, table plugin, loading/error/permission states, and production build.
- Backend: strict template validation, tenant isolation, Work Order/site permissions, draft/published version behavior, renderer authentication, timeouts/size limits, and legacy renderer regression tests.
- PDF: generate and inspect actual portrait and landscape A4 Work Order PDFs with long tables, missing optional data, branding, signature blocks and multi-page content. Compare rendered preview and PDF output. Keep actual artifacts/screenshots as evidence.
- Do not mark the pilot complete or broaden to Requests/other documents until this gate passes.

## 4. Delivery boundary

The repository audit above was completed before application changes. Implementation has since proceeded additively; no deployment or production data changes have been made.

## 5. Implementation status (2026-10-23)

| Area | Implemented in the working tree | Verification status |
| --- | --- | --- |
| Dependencies | Exact pdfme 6.2.8 frontend packages and a separately locked Node renderer package | Renderer test passes against the installed packages; no React or application framework upgrade |
| Designer | Existing route lazy-loads the real standalone pdfme Designer for Work Order templates; the template list supports starting blank or from an existing template; it preserves QPM legacy templates until save and uses existing draft, preview and publish APIs. The canvas has editable page-header/footer print zones, a page/object outline, per-table empty-state messages, data-provenance explanations, and an authorized availability/count diagnostic that hides field values. New starter templates and inserted components use French or English labels based on the current locale. | The print-zone implementation passed full Compose builds; recent outline, table, provenance, diagnostic, and localization changes pass TypeScript checks, Java compilation where applicable, and renderer syntax checks. The Docker images have not been rebuilt after these latest changes. No browser interaction/screenshot was verified. Existing saved user content is not automatically translated. |
| Storage/versioning | PDFME JSON remains in existing versioned JSONB configuration; `schemaVersion` records the pdfme release and template engine is marked PDFME | No migration required. Backend document/template/provider tests passed (40/40); validator tests after the final cross-page binding change pass (4/4) |
| Validation/security | Server allowlist accepts only Work Order data-provider bindings, A4 blank pages, supported schema plugins, bounded page/component counts and embedded PNG/JPEG content; Java calls a token-protected private Node service after resolving authorized Work Order data | Worker loopback test rejects missing token and generates a parseable multi-page PDF. `docker compose config --quiet` passes; the Docker image itself and live Spring-to-renderer wiring were not run here |
| PDF output | Existing QPM_NATIVE renderer stays intact; PDFME dispatch is separate and tables receive normalized server-resolved cells. Job Card includes the company logo plus legal identity, Work Order, asset/location, operations, labor, materials, safety/notes and signatures | Renderer test passes with an embedded `company.logo` binding and the regenerated synthetic 5+ page artifact is [qpm-work-order-sample.pdf](pdfme-evidence/qpm-work-order-sample.pdf). Java provider and schema tests pass, including same-company logo ownership and invalid image binding rejection. Real authorized Work Order data and human visual inspection remain outstanding. |
| Known gaps | One bounded TTF/OTF fallback font can now be uploaded and versioned with a template. Site-specific feature gating is not included. The starter template only uses QPM allowlisted fields and company-level template edit permissions; unsupported Work Order fields are rejected instead of silently ignored. | Visual PDF review, browser interaction, and production runtime validation still remain acceptance gates. |

The renderer token must be set as `PDFME_RENDERER_TOKEN` in the deployment environment with the same value injected into both the API and the private `pdfme-renderer` service. The service is not published to a host port. When no token is configured, PDFME rendering returns a service-unavailable response while the QPM_NATIVE engine remains available. Operator instructions are in [PDFME-DESIGNER-SETUP.md](PDFME-DESIGNER-SETUP.md). No deployment or production data changes were made.

The PDF artifact was not visually inspected in this environment: the installed Chromium Snap refused to start because Snap/AppArmor confinement is unavailable; the browser QA connector also could not start because `/opt/google/chrome/chrome` is absent, and no other local PDF rasterizer or Chrome executable was found. The artifact's evidence note records this limitation. Human PDF review and a successful production Web build are still acceptance gates, so the pilot is implemented but not declared complete.

## Official references consulted

- [pdfme Getting Started](https://pdfme.com/docs/getting-started)
- [pdfme Supported Features](https://pdfme.com/docs/supported-features)
- [pdfme Dynamic Tables](https://pdfme.com/docs/tables)
- [pdfme Custom Fonts](https://pdfme.com/docs/custom-fonts)
- [pdfme Custom Schemas and Plugins](https://pdfme.com/docs/custom-schemas)
- [pdfme Releases](https://github.com/pdfme/pdfme/releases)
