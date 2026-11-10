import { image, line, table } from '@pdfme/schemas';
import { PDFME_VERSION, type Template } from '@pdfme/common';
import {
  AUTHORING_PAGE_WIDTH,
  MUTED_TEXT_COLOR,
  PRIMARY,
  field,
  schemaFrom
} from './pdfmeSchemaHelpers';

type Translate = (key: string, options?: any) => string;

export interface PdfmeComponentDefinition {
  id: string;
  group: string;
  labelKey: string;
  bindings: readonly string[];
}

/**
 * Everything the visual designer needs to know about one document type. It mirrors the API's
 * PdfmeDocumentProfile (tables, columns, components); the server stays the authority and re-validates.
 */
export interface PdfmeDocumentProfile {
  providerCode: 'WORK_ORDER' | 'PURCHASE_ORDER' | 'PURCHASE_REQUISITION';
  /** Allowed columns of each repeated table, in their default order. */
  tableColumns: Record<string, string[]>;
  /** i18n suffix of `document_table_dataset_*` / `document_table_order_*` for each table. */
  tableDatasets: Record<string, string>;
  componentDefinitions: readonly PdfmeComponentDefinition[];
  componentGroups: readonly { id: string; labelKey: string }[];
  /** Schemas of a palette component, authored for a 297 mm wide page and placed at `y`. */
  componentSchemas: (id: string, t: Translate, y: number) => any[];
  createStarter: (t: Translate) => Template;
  /** Live field diagnostics and table previews exist only for work orders today. */
  supportsDataDiagnostics: boolean;
  previewReferenceLabelKey: string;
  /** Turns what the user typed (id or document number) into the source id, or null. */
  resolvePreviewSource: (reference: string) => Promise<string | null>;
  previewPdfPath: (templateId: number, sourceId: string) => string;
  provenance: (name: string) => { source: string; relationship: string };
}

const sharedComponents = [
  { id: 'textBlock', group: 'custom', labelKey: 'document_component_text_block', bindings: [] },
  { id: 'pageHeader', group: 'internal', labelKey: 'document_component_page_header', bindings: [] },
  { id: 'pageFooter', group: 'internal', labelKey: 'document_component_page_footer', bindings: [] }
] as const;

const tableSchema = (
  name: string,
  columns: string[],
  t: Translate,
  position: { x: number; y: number },
  width: number,
  height: number,
  widths: number[]
) => ({
  ...table.propPanel.defaultSchema,
  name,
  position,
  width,
  height,
  head: columns.map((key) => t(`document_table_column_${key}`)),
  columnBindings: columns,
  headWidthPercentages: widths,
  repeatHead: true,
  showHead: true,
  qpmEmptyMessage: t('document_table_empty_message_default'),
  content: '[]',
  headStyles: {
    ...table.propPanel.defaultSchema.headStyles,
    fontSize: 8,
    fontColor: '#FFFFFF',
    backgroundColor: PRIMARY,
    padding: { top: 2, right: 2, bottom: 2, left: 2 }
  },
  bodyStyles: {
    ...table.propPanel.defaultSchema.bodyStyles,
    fontSize: 8,
    padding: { top: 2, right: 2, bottom: 2, left: 2 }
  }
});

const label = (name: string, value: string, x: number, y: number, width: number) =>
  field(name, x, y, width, value, 7, { fontColor: MUTED_TEXT_COLOR, height: 5 });

const longText = { height: 18, dynamicFontSize: { min: 6, max: 9, fit: 'vertical' } };

const provenance = (prefix: string) => (name: string) => {
  if (name.startsWith('static:')) return { source: 'static', relationship: 'static' };
  if (name.startsWith('company.')) return { source: 'company', relationship: 'company' };
  if (name === 'site.name') return { source: 'site', relationship: 'site' };
  if (name.startsWith(`${prefix}.`)) return { source: prefix, relationship: prefix };
  return { source: 'static', relationship: 'static' };
};

/** Accepts "123", "PO-123" or "PR-123" (case-insensitive). */
const numberedReference = (prefix: string) => async (reference: string) => {
  const match = reference.trim().match(new RegExp(`^(?:${prefix}-?)?(\\d{1,18})$`, 'i'));
  return match ? match[1] : null;
};

/** Company identity block shared by the procurement starters (A4 portrait, 210 mm). */
const identityHeader = (t: Translate, title: string, numberField: string) => [
  schemaFrom(image, 'company.logo', '', { x: 12, y: 8 }, 30, 16, {
    objectFit: 'contain',
    objectPosition: 'left center',
    qpmPrintZone: 'HEADER'
  }),
  field('company.name', 46, 8, 90, t('document_field_company_name'), 12, { fontColor: PRIMARY }),
  field('company.legalName', 46, 16, 90, t('document_field_company_legalName'), 7, { fontColor: MUTED_TEXT_COLOR, height: 5 }),
  field('company.registeredAddress', 46, 21, 90, t('document_field_company_registeredAddress'), 7, { fontColor: MUTED_TEXT_COLOR, height: 5 }),
  field('static:qpm_document_title', 138, 8, 60, title, 12, { fontColor: PRIMARY, alignment: 'right', height: 9 }),
  field(numberField, 138, 18, 60, t(`document_field_${numberField.replace('.', '_')}`), 10, { alignment: 'right' }),
  schemaFrom(line, 'static:qpm_header_rule', '', { x: 12, y: 29 }, 186, 0.6, { color: PRIMARY })
];

const identityFooter = (t: Translate) => [
  schemaFrom(line, 'static:qpm_footer_rule', '', { x: 12, y: 280 }, 186, 0.4, { color: PRIMARY, qpmPrintZone: 'FOOTER' }),
  field('company.phone', 12, 283, 60, t('document_field_company_phone'), 7, { fontColor: MUTED_TEXT_COLOR, qpmPrintZone: 'FOOTER' }),
  field('company.email', 74, 283, 70, t('document_field_company_email'), 7, { fontColor: MUTED_TEXT_COLOR, qpmPrintZone: 'FOOTER' }),
  field('static:qpm_footer_page', 146, 283, 52, `${t('document_pdfme_page')} {currentPage} / {totalPages}`, 7, {
    alignment: 'right',
    qpmPrintZone: 'FOOTER'
  })
];

const signatureBlock = (t: Translate, y: number) => [
  label('static:qpm_signoff_requester_label', t('document_pdfme_signature_requester'), 12, y, 88),
  schemaFrom(line, 'static:qpm_signoff_requester_line', '', { x: 12, y: y + 16 }, 88, 0.4, { color: MUTED_TEXT_COLOR }),
  label('static:qpm_signoff_approver_label', t('document_pdfme_signature_approver'), 110, y, 88),
  schemaFrom(line, 'static:qpm_signoff_approver_line', '', { x: 110, y: y + 16 }, 88, 0.4, { color: MUTED_TEXT_COLOR })
];

const a4Template = (page: any[]): Template => ({
  pdfmeVersion: PDFME_VERSION,
  basePdf: { width: 210, height: 297, padding: [8, 8, 8, 8] },
  schemas: [page]
} as Template);

// Palette builders are authored for a 297 mm page like the work-order ones; the designer scales them.
const W = AUTHORING_PAGE_WIDTH - 24;
const title = (id: string, key: string, t: Translate, y: number) =>
  field(`static:qpm_${id}_title`, 12, y, W, t(key), 11, { fontColor: PRIMARY });
const textBlock = (t: Translate, y: number) =>
  [field('static:qpm_textBlock_content', 12, y, W, t('document_component_text_block_default'), 9, longText)];

/* ------------------------------------------------------------------ Purchase order */

const PO_LINE_COLUMNS = ['part', 'description', 'quantity', 'unit', 'unitPrice', 'currency', 'lineTotal', 'site'];

export const purchaseOrderProfile: PdfmeDocumentProfile = {
  providerCode: 'PURCHASE_ORDER',
  tableColumns: { 'purchaseOrder.lines': PO_LINE_COLUMNS },
  tableDatasets: { 'purchaseOrder.lines': 'poLines' },
  componentDefinitions: [
    { id: 'summary', group: 'purchaseOrder', labelKey: 'document_component_po_summary', bindings: ['purchaseOrder.number', 'purchaseOrder.name', 'purchaseOrder.status', 'purchaseOrder.date', 'purchaseOrder.shippingDueDate', 'purchaseOrder.category', 'purchaseOrder.requestedBy', 'purchaseOrder.requisition'] },
    { id: 'vendor', group: 'purchaseOrder', labelKey: 'document_component_vendor', bindings: ['purchaseOrder.vendor', 'purchaseOrder.vendorAddress', 'purchaseOrder.vendorPhone', 'purchaseOrder.vendorEmail'] },
    { id: 'shipping', group: 'purchaseOrder', labelKey: 'document_component_shipping', bindings: ['purchaseOrder.shipTo', 'purchaseOrder.shippingAddress', 'purchaseOrder.shippingCity', 'purchaseOrder.shippingState', 'purchaseOrder.shippingZipCode', 'purchaseOrder.shippingPhone', 'purchaseOrder.shippingFax'] },
    { id: 'lines', group: 'repeated', labelKey: 'document_component_lines', bindings: ['purchaseOrder.lines'] },
    { id: 'notes', group: 'context', labelKey: 'document_component_notes', bindings: ['purchaseOrder.notes', 'purchaseOrder.terms'] },
    { id: 'approvals', group: 'context', labelKey: 'document_component_approvals', bindings: ['purchaseOrder.approvalHistory'] },
    ...sharedComponents
  ],
  componentGroups: [
    { id: 'purchaseOrder', labelKey: 'document_component_group_purchase_order' },
    { id: 'repeated', labelKey: 'document_component_group_repeated' },
    { id: 'context', labelKey: 'document_component_group_context' },
    { id: 'custom', labelKey: 'document_component_group_custom' }
  ],
  componentSchemas: (id, t, y) => {
    if (id === 'summary') return [title(id, 'document_component_po_summary', t, y),
      field('purchaseOrder.number', 12, y + 10, 70, t('document_field_purchaseOrder_number'), 11, { fontColor: PRIMARY }),
      field('purchaseOrder.status', 88, y + 10, 60, t('document_field_purchaseOrder_status'), 9),
      field('purchaseOrder.date', 154, y + 10, 60, t('document_field_purchaseOrder_date'), 9),
      field('purchaseOrder.shippingDueDate', 220, y + 10, 65, t('document_field_purchaseOrder_shippingDueDate'), 9),
      field('purchaseOrder.requestedBy', 12, y + 20, 136, t('document_field_purchaseOrder_requestedBy'), 9),
      field('purchaseOrder.requisition', 154, y + 20, 131, t('document_field_purchaseOrder_requisition'), 9)];
    if (id === 'vendor') return [title(id, 'document_component_vendor', t, y),
      field('purchaseOrder.vendor', 12, y + 10, 136, t('document_field_purchaseOrder_vendor'), 10),
      field('purchaseOrder.vendorPhone', 154, y + 10, 131, t('document_field_purchaseOrder_vendorPhone'), 9),
      field('purchaseOrder.vendorAddress', 12, y + 20, 136, t('document_field_purchaseOrder_vendorAddress'), 9, { height: 12 }),
      field('purchaseOrder.vendorEmail', 154, y + 20, 131, t('document_field_purchaseOrder_vendorEmail'), 9)];
    if (id === 'shipping') return [title(id, 'document_component_shipping', t, y),
      field('purchaseOrder.shipTo', 12, y + 10, 136, t('document_field_purchaseOrder_shipTo'), 10),
      field('purchaseOrder.shippingPhone', 154, y + 10, 131, t('document_field_purchaseOrder_shippingPhone'), 9),
      field('purchaseOrder.shippingAddress', 12, y + 20, 136, t('document_field_purchaseOrder_shippingAddress'), 9),
      field('purchaseOrder.shippingCity', 154, y + 20, 65, t('document_field_purchaseOrder_shippingCity'), 9),
      field('purchaseOrder.shippingZipCode', 222, y + 20, 63, t('document_field_purchaseOrder_shippingZipCode'), 9)];
    if (id === 'lines') return [title(id, 'document_component_lines', t, y),
      tableSchema('purchaseOrder.lines', ['part', 'description', 'quantity', 'unit', 'unitPrice', 'lineTotal'], t,
        { x: 12, y: y + 10 }, W, 32, [20, 32, 10, 10, 14, 14])];
    if (id === 'notes') return [title(id, 'document_component_notes', t, y),
      field('purchaseOrder.notes', 12, y + 10, W, t('document_field_purchaseOrder_notes'), 9, longText),
      field('purchaseOrder.terms', 12, y + 30, W, t('document_field_purchaseOrder_terms'), 8, { height: 10 })];
    if (id === 'approvals') return [title(id, 'document_component_approvals', t, y),
      field('purchaseOrder.approvalHistory', 12, y + 10, W, t('document_field_purchaseOrder_approvalHistory'), 8, { ...longText, height: 30 })];
    return textBlock(t, y);
  },
  createStarter: (t) => a4Template([
    ...identityHeader(t, t('document_pdfme_po_title'), 'purchaseOrder.number'),
    label('static:qpm_vendor_label', t('document_component_vendor'), 12, 34, 90),
    field('purchaseOrder.vendor', 12, 40, 90, t('document_field_purchaseOrder_vendor'), 10),
    field('purchaseOrder.vendorAddress', 12, 47, 90, t('document_field_purchaseOrder_vendorAddress'), 8, { height: 10 }),
    field('purchaseOrder.vendorPhone', 12, 58, 44, t('document_field_purchaseOrder_vendorPhone'), 8),
    field('purchaseOrder.vendorEmail', 58, 58, 44, t('document_field_purchaseOrder_vendorEmail'), 8),
    label('static:qpm_details_label', t('document_pdfme_order_details'), 110, 34, 88),
    field('purchaseOrder.date', 110, 40, 88, t('document_field_purchaseOrder_date'), 8),
    field('purchaseOrder.shippingDueDate', 110, 47, 88, t('document_field_purchaseOrder_shippingDueDate'), 8),
    field('purchaseOrder.status', 110, 54, 88, t('document_field_purchaseOrder_status'), 8),
    field('purchaseOrder.requisition', 110, 61, 88, t('document_field_purchaseOrder_requisition'), 8),
    label('static:qpm_shipping_label', t('document_component_shipping'), 12, 70, 90),
    field('purchaseOrder.shipTo', 12, 76, 90, t('document_field_purchaseOrder_shipTo'), 9),
    field('purchaseOrder.shippingAddress', 12, 83, 90, t('document_field_purchaseOrder_shippingAddress'), 8),
    field('purchaseOrder.shippingCity', 12, 90, 44, t('document_field_purchaseOrder_shippingCity'), 8),
    field('purchaseOrder.shippingZipCode', 58, 90, 44, t('document_field_purchaseOrder_shippingZipCode'), 8),
    field('purchaseOrder.requestedBy', 110, 76, 88, t('document_field_purchaseOrder_requestedBy'), 8),
    field('site.name', 110, 83, 88, t('document_field_site_name'), 8),
    tableSchema('purchaseOrder.lines', ['part', 'description', 'quantity', 'unit', 'unitPrice', 'lineTotal'], t,
      { x: 12, y: 102 }, 186, 60, [22, 32, 10, 8, 14, 14]),
    label('static:qpm_notes_label', t('document_component_notes'), 12, 168, 186),
    field('purchaseOrder.notes', 12, 174, 186, t('document_field_purchaseOrder_notes'), 8, longText),
    field('purchaseOrder.terms', 12, 194, 186, t('document_field_purchaseOrder_terms'), 8, { height: 10 }),
    label('static:qpm_approvals_label', t('document_component_approvals'), 12, 208, 186),
    field('purchaseOrder.approvalHistory', 12, 214, 186, t('document_field_purchaseOrder_approvalHistory'), 7, { ...longText, height: 30 }),
    ...signatureBlock(t, 250),
    ...identityFooter(t)
  ]),
  supportsDataDiagnostics: false,
  previewReferenceLabelKey: 'document_designer_preview_po_reference',
  resolvePreviewSource: numberedReference('PO'),
  previewPdfPath: (templateId, sourceId) =>
    `document-templates/${templateId}/preview-procurement-pdf?providerCode=PURCHASE_ORDER&sourceId=${encodeURIComponent(sourceId)}`,
  provenance: provenance('purchaseOrder')
};

/* ------------------------------------------------------------ Purchase requisition */

const PR_LINE_COLUMNS = ['part', 'description', 'quantity', 'unit', 'notes', 'site'];

export const purchaseRequisitionProfile: PdfmeDocumentProfile = {
  providerCode: 'PURCHASE_REQUISITION',
  tableColumns: { 'purchaseRequisition.lines': PR_LINE_COLUMNS },
  tableDatasets: { 'purchaseRequisition.lines': 'prLines' },
  componentDefinitions: [
    { id: 'summary', group: 'purchaseRequisition', labelKey: 'document_component_pr_summary', bindings: ['purchaseRequisition.number', 'purchaseRequisition.title', 'purchaseRequisition.status', 'purchaseRequisition.requester', 'purchaseRequisition.requiredDate', 'purchaseRequisition.createdDate', 'purchaseRequisition.sourceWorkOrder'] },
    { id: 'justification', group: 'purchaseRequisition', labelKey: 'document_component_justification', bindings: ['purchaseRequisition.justification'] },
    { id: 'lines', group: 'repeated', labelKey: 'document_component_lines', bindings: ['purchaseRequisition.lines'] },
    { id: 'approvals', group: 'context', labelKey: 'document_component_approvals', bindings: ['purchaseRequisition.approvalHistory'] },
    ...sharedComponents
  ],
  componentGroups: [
    { id: 'purchaseRequisition', labelKey: 'document_component_group_purchase_requisition' },
    { id: 'repeated', labelKey: 'document_component_group_repeated' },
    { id: 'context', labelKey: 'document_component_group_context' },
    { id: 'custom', labelKey: 'document_component_group_custom' }
  ],
  componentSchemas: (id, t, y) => {
    if (id === 'summary') return [title(id, 'document_component_pr_summary', t, y),
      field('purchaseRequisition.number', 12, y + 10, 70, t('document_field_purchaseRequisition_number'), 11, { fontColor: PRIMARY }),
      field('purchaseRequisition.status', 88, y + 10, 60, t('document_field_purchaseRequisition_status'), 9),
      field('purchaseRequisition.requiredDate', 154, y + 10, 60, t('document_field_purchaseRequisition_requiredDate'), 9),
      field('purchaseRequisition.createdDate', 220, y + 10, 65, t('document_field_purchaseRequisition_createdDate'), 9),
      field('purchaseRequisition.title', 12, y + 20, 136, t('document_field_purchaseRequisition_title'), 10),
      field('purchaseRequisition.requester', 154, y + 20, 65, t('document_field_purchaseRequisition_requester'), 9),
      field('purchaseRequisition.sourceWorkOrder', 222, y + 20, 63, t('document_field_purchaseRequisition_sourceWorkOrder'), 9)];
    if (id === 'justification') return [title(id, 'document_component_justification', t, y),
      field('purchaseRequisition.justification', 12, y + 10, W, t('document_field_purchaseRequisition_justification'), 9, longText)];
    if (id === 'lines') return [title(id, 'document_component_lines', t, y),
      tableSchema('purchaseRequisition.lines', ['part', 'description', 'quantity', 'unit', 'notes'], t,
        { x: 12, y: y + 10 }, W, 32, [22, 34, 10, 10, 24])];
    if (id === 'approvals') return [title(id, 'document_component_approvals', t, y),
      field('purchaseRequisition.approvalHistory', 12, y + 10, W, t('document_field_purchaseRequisition_approvalHistory'), 8, { ...longText, height: 30 })];
    return textBlock(t, y);
  },
  createStarter: (t) => a4Template([
    ...identityHeader(t, t('document_pdfme_pr_title'), 'purchaseRequisition.number'),
    field('purchaseRequisition.title', 12, 34, 186, t('document_field_purchaseRequisition_title'), 11),
    label('static:qpm_request_label', t('document_pdfme_request_details'), 12, 44, 90),
    field('purchaseRequisition.requester', 12, 50, 90, t('document_field_purchaseRequisition_requester'), 8),
    field('purchaseRequisition.sourceWorkOrder', 12, 57, 90, t('document_field_purchaseRequisition_sourceWorkOrder'), 8),
    field('site.name', 12, 64, 90, t('document_field_site_name'), 8),
    label('static:qpm_dates_label', t('document_pdfme_dates'), 110, 44, 88),
    field('purchaseRequisition.createdDate', 110, 50, 88, t('document_field_purchaseRequisition_createdDate'), 8),
    field('purchaseRequisition.requiredDate', 110, 57, 88, t('document_field_purchaseRequisition_requiredDate'), 8),
    field('purchaseRequisition.status', 110, 64, 88, t('document_field_purchaseRequisition_status'), 8),
    label('static:qpm_justification_label', t('document_component_justification'), 12, 74, 186),
    field('purchaseRequisition.justification', 12, 80, 186, t('document_field_purchaseRequisition_justification'), 8, longText),
    tableSchema('purchaseRequisition.lines', ['part', 'description', 'quantity', 'unit', 'notes'], t,
      { x: 12, y: 104 }, 186, 70, [22, 34, 10, 10, 24]),
    label('static:qpm_approvals_label', t('document_component_approvals'), 12, 182, 186),
    field('purchaseRequisition.approvalHistory', 12, 188, 186, t('document_field_purchaseRequisition_approvalHistory'), 7, { ...longText, height: 40 }),
    ...signatureBlock(t, 240),
    ...identityFooter(t)
  ]),
  supportsDataDiagnostics: false,
  previewReferenceLabelKey: 'document_designer_preview_pr_reference',
  resolvePreviewSource: numberedReference('PR'),
  previewPdfPath: (templateId, sourceId) =>
    `document-templates/${templateId}/preview-procurement-pdf?providerCode=PURCHASE_REQUISITION&sourceId=${encodeURIComponent(sourceId)}`,
  provenance: provenance('purchaseRequisition')
};

export const PDFME_PROCUREMENT_PROFILES: Record<string, PdfmeDocumentProfile> = {
  PURCHASE_ORDER: purchaseOrderProfile,
  PURCHASE_REQUISITION: purchaseRequisitionProfile
};
