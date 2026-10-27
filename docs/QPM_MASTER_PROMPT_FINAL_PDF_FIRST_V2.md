# QPM — MASTER PROMPT: ENTERPRISE DOCUMENT & REPORT MANAGEMENT SYSTEM

**Role:** Act as Principal Software Architect, Senior Spring Boot/React Engineer, Enterprise SaaS Architect, UI/UX Designer, Security Engineer, and SAP Reporting Integration Specialist.

**Mission:** Audit the existing QPM CMMS/EAM repository, then design and implement a production-ready, multi-tenant, metadata-driven Document & Report Management System. Deliver extensible print templates for Work Orders (WO), Work Requests (WR), Purchase Requests (PR), Purchase Orders (PO), and future document types, without requiring code changes for standard custom document creation.

**Expected stack (verify, do not assume):** React.js frontend, Java Spring Boot/Maven backend, PostgreSQL, React Native mobile, Docker/VPS deployment.


> **CRITICAL DELIVERY PRIORITY — PDF FIRST (22 OCT 2026):** QPM already has a partially implemented Document Templates feature. **Do not rebuild it. The immediate deliverable is a professionally formatted, usable Work Order PDF / Job Card, BEFORE implementing drag-and-drop or a full visual designer.** Audit existing code, fix the actual PDF pipeline and business data mapping, validate real PDFs, then improve template-library UX, and only afterward develop WYSIWYG editing. This priority overrides any earlier phase ordering that conflicts with it.

## 0. NON-NEGOTIABLE EXECUTION RULES

1. **Audit before editing.** Inspect repository structure, existing document printing/PDF workflows, business modules, auth, tenancy, DB migrations, storage, and deployment. Reuse existing components and conventions.
2. **Do not create a new standalone app or migrate the whole platform.** Prefer a modular monolith with a separately isolated PDF rendering worker.
3. **Do not hardcode supported document types.** WO/WR/PR/PO are initial registry entries, not a fixed enum limiting future documents.
4. **Preserve existing features and APIs.** Avoid destructive database changes; use tested migrations and rollback plans.
5. **Never trust client-provided tenant IDs or data bindings.** Derive tenant identity from trusted auth context and enforce object-level permissions.
6. **Do not run arbitrary tenant-provided SQL, JavaScript, HTML scripts, or unrestricted remote resources.** Use declarative schemas, approved field registries, and sandboxed rendering.
7. **Do not assume Crystal Reports `.rpt` files run natively in Spring Boot.** Verify SAP product/SDK/API compatibility, platform requirements, and licensing before implementing an adapter.
8. **Do not claim tests or integrations pass unless executed.** Report blockers, limitations, and evidence.
9. **Do not deploy to production or mutate production data without explicit authorization.**
10. Start with a repository audit and implementation plan; seek approval before significant architecture changes or irreversible operations. Then implement incrementally.

## 1. PRODUCT VISION

Build **Administration → Document & Report Management** with:

- **Document Type Registry** (system and tenant-custom types)
- **Template Library** (search, filter, duplicate, preview, publish, archive)
- **Visual Document Designer** (drag-and-drop, field binding, responsive UI)
- **Branding & Layout Settings** (logo, colors, typography, paper size)
- **Print & Export Settings** (PDF, engine choice, defaults)
- **Report Integrations** (HTML/PDF native, JasperReports, optional SAP Crystal Reports)
- **Document Generation History** (audit, status, download, template version)

Study Frappe/ERPNext Print Format Builder for usability; JasperReports/Jaspersoft Studio for advanced reporting; SAP Crystal Reports for external report integration. These are references, not requirements to install or replace QPM's stack.

### Initial supported documents

- Work Order (WO)
- Work Request (WR)
- Purchase Request (PR)
- Purchase Order (PO)
- Inspection Report
- Maintenance Checklist
- Equipment Report

All must use the same extensible type registry, template model, and rendering pipeline.

## 2. ARCHITECTURE: MODULAR MONOLITH + ISOLATED PDF WORKER

Recommended logical structure (adapt to actual repository):

```text
qpm-backend/
  modules/
    maintenance/
    procurement/
    document-management/
      api/
      application/
      domain/
      infrastructure/
      registry/
      template/
      designer/
      rendering/
      integration/
      audit/
    reporting/
  shared/
    security/
    tenant/
    storage/
```

Keep domain orchestration, template lifecycle, type registry, and authorization in Spring Boot. Execute resource-intensive HTML-to-PDF generation in an isolated worker/process/container. Use Spring Modulith if compatible and useful for enforcing module boundaries. Avoid direct queries into other modules' private tables: introduce stable `DocumentDataProvider` interfaces.

Do not require Kafka, Kubernetes, or a new distributed architecture for the MVP. Start with a durable PostgreSQL-backed job queue or reuse an existing job system; extract a reporting microservice only if actual load, independent scaling, or third-party runtime constraints justify it.

### Core extension interfaces

```java
public interface DocumentDataProvider {
    String providerCode();
    DocumentFieldSchema availableFields();
    DocumentData resolve(DocumentContext context, String recordId);
}

public interface ReportEngine {
    String getEngineCode();
    RenderResult render(RenderRequest request);
}
```

Adapt these illustrative signatures to actual project patterns. Enforce tenant, role, and record authorization before resolving data or rendering.

## 3. DYNAMIC DOCUMENT TYPE REGISTRY — REQUIRED FROM THE START

**Fundamental principle:** A new standard document type must not require a new Java entity, controller, database table, or React page. System documents are registered like custom types but can have protected definitions.

Allow authorized tenant administrators to:

1. Register document name, unique code, category, description, and status.
2. Select an approved business data provider or an authorized custom dataset.
3. Choose fields and field types, labels, default values, validation, and conditional visibility.
4. Add tenant-scoped custom fields and structured custom data where supported.
5. Associate multiple template variants and default selection rules.
6. Configure permissions, activation, versioning, and archival.
7. Create, preview, publish, and print without source-code changes.
8. Add future providers via a controlled server-side adapter/plugin interface.

Separate **document presentation** from **new business workflows**: a printable certificate based on existing equipment data is configurable; a new transactional process with complex approvals may require a workflow engine or custom business implementation.

### Mandatory acceptance example

An administrator creates `EQUIPMENT_HANDOVER` / “Equipment Handover Certificate”, selects the existing Equipment provider, includes equipment number, description, functional location, handover date, condition, remarks, and signatures, adds custom fields, chooses A4 landscape, designs and publishes a template, and generates a PDF **without code changes**.

### Data source controls

- Field catalog must be server-defined and authorization-aware.
- No arbitrary SQL, URL fetching, code execution, or cross-tenant joins.
- Version field definitions; validate binding types and required data.
- Permit safe custom datasets only through approved schemas and persistence rules.
- Make type definitions discoverable by Template Library and Designer automatically.

## 4. TEMPLATE LIBRARY & LIFECYCLE

Each template needs: template ID/code, tenant, document type, display name, description, rendering engine, style, schema version, draft/published/archived status, immutable published version, author/editor, timestamps, default scope, and preview metadata.

Operations: create, edit draft, duplicate, preview, compare versions, publish, archive, restore where supported, list/search/filter/sort/paginate. Only one default may apply for a specific tenant + document type + usage context; enforce this at the database/service level. Historical generated documents must reference the exact immutable template version used.

Support **Classic**, **Modern**, and **Custom** template styles. Ship polished Classic and Modern examples for WO, WR, PR, PO. Keep them printer-friendly, consistent with QPM's design system, and suitable for A4/Letter, portrait/landscape.

## 5. VISUAL DESIGNER — FRAPPE-INSPIRED UX

Desktop layout:

- Left: component palette and authorized data-field catalog.
- Center: page canvas with print boundaries and zoom.
- Right: selected component properties, formatting, and data binding.
- Top: document name, save draft, undo/redo, preview, validate, publish, page settings.

Responsive tablet/mobile administration must remain usable, but complex desktop drag-and-drop need not be replicated identically on phones. Use existing React components and design tokens. Consider dnd-kit if compatible.

### Required capabilities

- Add, move, resize, duplicate, remove components.
- Sections, columns, grids, alignment, snapping, spacing, typography, borders, backgrounds.
- Dynamic fields, conditional sections, repeated tables, calculated display fields based on trusted server values.
- Header/footer, page number, repeating table headers, controlled page breaks.
- Real-time preview with sample data and authorized live records.
- Undo/redo, schema validation, draft autosave if compatible, accessibility, keyboard support.
- Logos, images, text, rich text, headings, dividers, QR/barcodes, signatures, tables, labor, materials, totals, attachments references.
- A4/Letter, portrait/landscape, configurable margins and pagination.

Render a declarative component tree, not arbitrary executable markup from customers. Sanitize rich text and validate assets.

## 6. VERSIONED JSON CONFIGURATION

Use a versioned JSON/JSONB schema for the layout tree, components, style, field bindings, conditions, page settings, and engine options. Example starting point:

```json
{
  "templateCode": "QPM-WO-MODERN",
  "documentType": "WORK_ORDER",
  "name": "Modern Work Order",
  "version": 1,
  "schemaVersion": "1.0",
  "status": "DRAFT",
  "style": "modern",
  "engine": "html",
  "page": {"size": "A4", "orientation": "landscape", "marginMm": 10},
  "branding": {"useCompanyLogo": true, "useCompanyColors": true},
  "visibleFields": ["logo", "number", "equipment", "operations", "labor", "signature"],
  "options": {"showPageNumbers": true, "repeatTableHeader": true, "showApprovalStatus": true}
}
```

Extend with a validated `layout` tree, stable component IDs, typed field bindings, conditional expressions from a safe DSL, and style properties. Derive tenant from authentication, not user-supplied JSON. Add schema migration/version compatibility rules.

## 7. BUSINESS DATA FIELD CATALOGS

Expose only fields that actually exist in QPM; map to existing authoritative services. Handle optional/null data without inventing values.

### Work Order

WO number, description, status, priority, asset/equipment, functional location, maintenance type, work center/team, planned/actual dates, operations, planned/actual labor hours, assigned employees, materials, safety instructions, permits, tools, checklists, findings, technician notes, supervisor approvals, signatures, QR code.

**Critical regression check:** actual labor hours and employee details shown in the application must appear in print when present and enabled in the selected template.

### Work Request

WR number, requester, equipment, location, problem, priority, requested date, attachments, status, approval information.

### Purchase Request

PR number, requester, department, request/required dates, site, cost center, WBS/project reference, line items, quantities, units, estimated prices, currency, justification, approval workflow and signatures.

### Purchase Order

PO number, supplier, company, billing/delivery addresses, order/delivery dates, currency, item codes/descriptions, quantities, unit prices, discounts, taxes, freight, subtotal/grand total, payment/delivery terms, notes, prepared/approved by, supplier acknowledgment.

**Financial rule:** official totals must come from trusted backend business calculations; never treat browser-only calculations as authoritative.

### Additional types

Equipment Handover Certificate, Goods Receipt Note, Safety Inspection, Calibration Certificate, and future company-defined types should be registered through metadata and approved data providers.

## 8. RENDERING, PRINTING & JOBS

### Native engine

Use HTML/CSS with a controlled server-side renderer and isolated Chromium/Playwright PDF worker. Support page dimensions, typography, multi-page tables, repeatable headers, images, signatures, QR/barcodes, and deterministic print layouts.

### Worker security/reliability

- Restrict network access, filesystem access, runtime permissions, and temporary files.
- Bound memory/CPU/concurrency, execution time, page count, and output size.
- Prevent SSRF and remote asset loading; use approved stored assets.
- Queue jobs durably with statuses `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`, optionally `CANCELLED`.
- Implement bounded retries, idempotency, retention, secure downloads, structured errors, audit events, and correlation IDs.
- Ensure a worker outage does not break core WO/PO/PR business operations.

### Optional JasperReports adapter

Register approved JRXML reports, map typed parameters, execute using compatible Java dependencies, export supported formats (PDF, XLSX where appropriate), and report failures. Do not promise automatic conversion from visual JSON layouts to JRXML.

### Optional SAP Crystal Reports adapter

First audit the actual SAP landscape, SAP BusinessObjects BI Platform availability, version, licensed capabilities, compatible SDKs/REST APIs, runtime OS, and deployment constraints.

Where supported, implement report registration, `.rpt` metadata, connection configuration, typed parameter mappings (e.g. WO_NUMBER, PO_NUMBER, SITE, START_DATE, END_DATE), remote execution, job polling, secure result retrieval, scheduling, and error logs. Store secrets securely; never expose SAP credentials to frontend clients. Do not claim generic `.rpt` execution works without a compatible SAP runtime. Keep native PDF available when Crystal integration is disabled.

## 9. DATABASE & TENANCY

Inspect existing schema and migrations before designing tables. Candidate entities:

- `document_types`
- `document_type_versions` / field definitions
- `document_templates`
- `document_template_versions`
- `document_branding_settings`
- `document_generation_jobs`
- `generated_documents`
- `report_integrations`
- `report_parameter_mappings`
- `document_audit_logs`

Use JSONB for variable layouts, normalized columns for keys, constraints, ownership, status, and search. Add tenant-aware indexes and uniqueness constraints. Published template versions must be immutable. Retain the exact version used for each generated document. Store generated files in private storage (existing system or S3-compatible); use authorized access or short-lived signed URLs.

Permissions (map to existing RBAC):

- DOCUMENT_TEMPLATE_VIEW / CREATE / EDIT / PUBLISH / ARCHIVE
- DOCUMENT_TYPE_CREATE / EDIT / VIEW
- DOCUMENT_GENERATE / DOCUMENT_HISTORY_VIEW
- REPORT_INTEGRATION_MANAGE

Test tenant isolation for templates, field catalogs, data records, previews, jobs, integration credentials, and downloads. Record-level authorization is required in addition to tenant-level access.

## 10. REST API CONTRACTS

Adapt naming to existing QPM conventions. Suggested endpoints:

```text
GET    /api/v1/document-types
POST   /api/v1/document-types
GET    /api/v1/document-types/{id}/fields
PUT    /api/v1/document-types/{id}
GET    /api/v1/document-templates
POST   /api/v1/document-templates
GET    /api/v1/document-templates/{id}
PUT    /api/v1/document-templates/{id}
POST   /api/v1/document-templates/{id}/duplicate
POST   /api/v1/document-templates/{id}/preview
POST   /api/v1/document-templates/{id}/publish
POST   /api/v1/document-templates/{id}/archive
POST   /api/v1/documents/render
GET    /api/v1/document-jobs/{id}
GET    /api/v1/document-jobs/{id}/download
GET    /api/v1/report-integrations
POST   /api/v1/report-integrations
```

Use typed DTOs, validation, pagination, consistent errors, audit, and authorization. Example render request:

```json
{"documentType":"WORK_ORDER","documentId":"12345","templateCode":"QPM-WO-MODERN","outputFormat":"PDF"}
```

Resolve the active published template version server-side, authorize the referenced business record, obtain its data through the approved provider, then queue/render the document.

## 11. FRONTEND IMPLEMENTATION

Suggested feature organization:

```text
features/document-management/
  components/
    TemplateLibrary/
    DocumentDesigner/
    DocumentCanvas/
    ComponentPalette/
    PropertiesPanel/
    DocumentPreview/
    DocumentTypeRegistry/
    BrandingSettings/
    ReportIntegrations/
  hooks/
  services/
  schemas/
  types/
  utils/
```

Reuse existing routing, API client, auth state, form controls, modals, notifications, typography, colors, iconography, and responsive conventions. Do not introduce an inconsistent second design system. Optimize for nontechnical administrators, accessible interactions, clear previews, and minimal visual clutter.

## 12. TESTING & ACCEPTANCE

Implement unit, integration, API, frontend component, and end-to-end tests covering:

1. Tenant admin creates, edits, previews, and publishes a WO template.
2. WO PDF contains actual labor and employee details when data exists and fields are enabled.
3. PO PDF displays backend-authoritative totals.
4. PR and WR templates print correctly.
5. Classic/Modern layouts work in A4 portrait and landscape.
6. Long operations/item tables paginate correctly with repeated headers.
7. Admin creates `EQUIPMENT_HANDOVER` with existing fields plus custom fields, publishes, and generates PDF **without code changes**.
8. Cross-tenant template/data/download access is denied.
9. Non-admin cannot publish templates; users cannot print unauthorized records.
10. Published versions are immutable; historical documents retain their version references.
11. Failed/timeout rendering jobs are safely retried or reported.
12. Native PDF works when Jasper/Crystal adapters are absent or offline.
13. Invalid bindings, unsafe expressions, and malicious asset URLs are rejected.
14. Existing maintenance/procurement workflows continue to pass regression tests.

Run real tests and provide commands/results. Do not fabricate successful test evidence.

## 13. PHASED DELIVERY PLAN

**Phase 0 — Audit & design:** Inspect repository; report current architecture, existing print features, auth/tenancy, schema, reuse opportunities, risks, and implementation plan. Obtain approval for major decisions.

**Phase 1 — Registry & backend foundation:** Dynamic document type registry, approved field catalog, template domain, JSON schema validation, database migrations, RBAC, tenancy, immutable versions, APIs.

**Phase 2 — Visual Designer:** Template Library, canvas, component palette, property editor, layout tree, branding, Classic/Modern examples, draft/preview/publish.

**Phase 3 — Native PDF:** Isolated Chromium worker, durable jobs, secure file storage, history, printing, download, multi-page layout.

**Phase 4 — Business integration:** Wire WO, WR, PR, PO to authorized data providers and actual QPM screens. Validate labor, employee, materials, totals, and approvals.

**Phase 5 — Extensibility proof:** Create Equipment Handover Certificate end-to-end via admin configuration, without backend/frontend code changes.

**Phase 6 — Optional enterprise reporting:** JasperReports adapter; Crystal Reports compatibility assessment and adapter only when SAP prerequisites are available.

**Phase 7 — Hardening:** Security, load/performance, accessibility, regression, operational observability, admin/developer documentation, deployment checks.

## 14. DEFINITION OF DONE

- QPM retains its existing business workflows and design system.
- Company admins can configure new standard document types and print templates without editing code.
- Template versions, permissions, branding, and defaults are tenant-scoped.
- WO/WR/PR/PO have functional, professional, printable templates.
- A4/Letter and portrait/landscape are supported.
- Native PDF generation is isolated, secure, observable, and reliable.
- Generated documents are tied to source record and immutable template version.
- New Equipment Handover Certificate is demonstrated through the dynamic registry.
- Optional Jasper/Crystal adapters do not block native operation.
- Automated tests are executed and documented; limitations are clearly stated.

## 15. REQUIRED OUTPUTS FROM THE CODING AGENT

1. Repository audit and current-state architecture.
2. Architecture decision record: modular monolith vs microservices and worker boundary.
3. Affected file inventory and implementation plan.
4. Database schema/migrations and rollback strategy.
5. API contracts and field/data-provider registry.
6. Frontend designer and template library.
7. Working native PDF pipeline and example templates.
8. Tests, results, and unresolved issues.
9. Jasper/Crystal integration design and compatibility constraints.
10. Deployment and operations guide.
11. Administrator guide and developer extension guide.
12. Final implementation summary and next steps.

**Execution directive:** Begin now with Phase 0: inspect the actual repository. Present grounded findings and a prioritized plan before modifying architecture. Once approved, implement in small testable increments. Prioritize working native document generation and dynamic document type extensibility over premature infrastructure complexity.


---

## 16. IMPLEMENTATION UPDATE — EXISTING UI AUDIT (22 OCT 2026)

The user has already implemented a first version of QPM Document Templates. **Treat the module as existing software to improve, not a greenfield feature.** Screenshots show:

- Settings → Document Templates page with search, Create template, and a card for `JOB CARD` / `WO01` marked Draft v1.
- UI actions for Edit, Duplicate, Version history, Preview, Publish, Publish as default, and Archive. Their actual backend behavior is **not yet verified**.
- An Edit template modal with name, description, A4 paper, landscape orientation, compact density, 10 mm margins, page numbers, repeat-table-header toggle, and checkboxes for fields.
- A generated `Work Order Report` for sample WO `WO000001` (`WEEKLY BEARING INSPECTION`), containing company header and a generic `Field | Value` table.
- PDF output with duplicated company identity fields, empty values (e.g. Due date, Assigned to, Site), unstructured equipment/maintenance details, and no visible operations/labor/materials/signature sections.
- Template-card action labels are cramped, misaligned, and wrap awkwardly; the edit modal is excessively long with nested scrolling.

**These are screenshot observations, not proof of underlying code completeness.** Inspect code, migrations, endpoints, data bindings, and actual generated files before asserting anything.

### 16.1 Mandatory execution sequence — do not reverse

**P0-A: Repository audit and baseline preservation**

1. Find existing template controller/service/entities, renderers, CSS/HTML, PDF generation, data fetchers, tenant checks, and migrations.
2. Inventory implemented/partial/missing capabilities and capture before-state PDF screenshots/test fixtures.
3. Confirm whether the displayed PDF comes from a published version or preview; verify version and status behavior.
4. Keep legacy templates functional through a compatibility renderer or safe migration; do not silently change archived document output.

**P0-B: FIX PDF RENDERING FIRST — mandatory usable deliverable before WYSIWYG**

1. Replace the generic two-column `Field | Value` PDF with semantic **Work Order / Job Card** print layouts. Keep a generic key-value fallback only for explicitly selected generic reports.
2. Ship **Classic** (minimal, low-ink) and **Modern** (polished, professional) A4 landscape templates with clear typography and restrained branding; also support portrait when selected.
3. Print a clear company identity header only once, WO number, description, status/priority, site, asset/equipment, functional location, schedule and dates, assigned team, and relevant maintenance metadata.
4. Add repeatable **operations** table (operation number, description, work center, planned hours, actual hours, employee, status), **labor confirmations**, **materials/spares**, safety/permit instructions, technician findings/notes, and supervisor/technician signatures where data and configuration allow.
5. Use real authorized QPM data-provider results; do not invent labor, material, employee, signatures, dates, or financial values. Clearly distinguish planned from actual hours. Never print fabricated zeroes for unknown quantities or hours.
6. Apply a documented missing-data policy: hide empty optional rows by default; allow intentionally blank execution fields when a paper form requires handwriting; show explicit 'Not available' only where operationally necessary.
7. Support dynamic tables, long descriptions, multi-page documents, repeating table headers, safe page breaks, fixed print margins, page numbers, logo sizing, and print-safe colors.
8. Render PDF on the server using the existing supported engine or an isolated HTML/Chromium worker; ensure preview and exported PDF use the same validated layout/data model.
9. Verify output visually using generated PDFs for short, long, partially filled, and multi-page WOs; test A4 landscape and portrait, and both Classic and Modern variants.
10. Do not mark this phase complete until an actual WO Job Card PDF is generated, opened, visually inspected, and validated against the source WO record.

**P0-C: Template library and editor UX cleanup**

- Fix crowded actions: primary Preview/Edit plus a secondary accessible action menu for Duplicate, Versions, Publish, Set default, Archive.
- Make status/version/type clear, add useful search/filter/sort and loading/empty/error states.
- Replace the long edit modal with a dedicated page or well-structured tabs for General, Page, Fields, Branding, Preview, and Publishing; retain the existing QPM design system.
- Keep the current checkbox-based configuration operational as a lightweight mode while advanced designer work is pending.
- Provide an immediate PDF preview using authorized record data and clear Draft vs Published indication.

**P1: Full-page Visual Designer (AFTER P0 PDF acceptance)**

- Canvas with realistic A4/Letter dimensions, component palette, property inspector, grid/sections/columns, drag-and-drop, resize, reorder, duplicate, delete, undo/redo, zoom, and conditional visibility.
- WYSIWYG preview and PDF must share a validated declarative layout schema and rendering primitives, avoiding divergent browser-only styling.
- Support template blocks for company header, WO identification, operations, labor, materials, safety, signatures, footers, page numbers, and arbitrary approved field bindings.
- Provide accessible keyboard alternatives to drag-and-drop and responsive read/preview/edit flows.

**P1/P2: Dynamic document extensibility and integrations**

- Preserve the original requirements for a tenant-aware Dynamic Document Type Registry, configurable custom fields, approved data providers, and future document types.
- Implement PR, PO, WR, inspections and certificates with semantic layouts, not merely generic key-value lists.
- Keep JasperReports and SAP Crystal Reports as optional engine adapters, subject to verified compatibility, licenses and server prerequisites; never block native PDF generation.

### 16.2 Target Work Order print layout

1. **Header:** logo, company identity, title `WORK ORDER / JOB CARD`, WO number, version/date/page.
2. **Work identification:** description, equipment, FL, site, maintenance type, priority, status, planned dates.
3. **Execution details:** operation table with planned/actual labor and assigned resources where available.
4. **Materials:** material code, description, required/issued quantities and units (where available).
5. **Safety & findings:** instructions, permits, checklist or blank technician notes as configured.
6. **Validation:** performed by, checked by, approval/signature and date fields, only when supported or intentionally left blank for physical execution.
7. **Footer:** controlled page number and optional document metadata; no repeated company field dump.

Layout should be legible when printed in grayscale, avoid excessively dense content, and leave practical space for field execution. Tables must not overflow page boundaries.

### 16.3 PDF-first acceptance criteria — release gate

- A generated PDF for an authorized WO is **not** a generic Field/Value listing.
- Classic and Modern A4 landscape Job Cards are both functional.
- Company information appears once in a properly sized header, not repeated as arbitrary report rows.
- Operations, labor, materials, and signature sections appear when enabled and supported; unsupported data is never invented.
- Planned and actual values are labeled accurately and match authoritative QPM records.
- Empty optional data is handled according to explicit rules; no misleading `0.0` defaults.
- PDF text remains readable; long tables span pages cleanly; margins, repeated headers, and page numbers work.
- A PDF has been generated and inspected with real or clearly identified test records.
- Existing published templates and tenant isolation are preserved; no regressions in existing print workflows.
- Relevant automated tests run and their actual outcomes are reported.

**Do not begin drag-and-drop implementation until this PDF-first release gate is met or the user explicitly changes priority.**

### 16.4 Required agent report after each milestone

Report: inspected files and evidence; implemented changes; example output paths; tests executed and results; before/after rendering observations; remaining gaps; next prioritized tasks. If the agent cannot access the repository or run a renderer, say so and do not claim implementation or verification.
