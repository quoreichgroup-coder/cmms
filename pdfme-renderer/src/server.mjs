import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { generate } from '@pdfme/generator';
import { PDFDocument } from '@pdfme/pdf-lib';
import {
  barcodes,
  ellipse,
  image,
  line,
  multiVariableText,
  rectangle,
  signature,
  table,
  text
} from '@pdfme/schemas';

const PORT = Number(process.env.PORT || 8090);
const TOKEN = process.env.PDFME_RENDERER_TOKEN || '';
const MAX_BODY_BYTES = 8 * 1024 * 1024;
const MAX_INPUTS = 20;
const MAX_PDF_BYTES = 20 * 1024 * 1024;
const MAX_CONCURRENT_RENDERS = 2;
let activeRenders = 0;
const ALLOWED_TYPES = new Set([
  'text',
  'multiVariableText',
  'image',
  'signature',
  'table',
  'line',
  'rectangle',
  'ellipse',
  'qrcode'
]);
const ALLOWED_BINDINGS = new Set([
  'workOrder.customId', 'workOrder.title', 'workOrder.description', 'workOrder.status',
  'workOrder.priority', 'workOrder.dueDate', 'workOrder.completedAt', 'workOrder.estimatedDuration',
  'workOrder.category', 'workOrder.team', 'workOrder.completedBy', 'workOrder.assignedTo',
  'workOrder.feedback', 'workOrder.signature', 'asset.name', 'asset.serialNumber', 'location.name',
  'site.name', 'company.name', 'company.legalName', 'company.registeredAddress',
  'company.registrationNumber', 'company.taxNumber', 'company.phone', 'company.email',
  'company.logo',
  'workOrder.executionTasks', 'workOrder.laborTimeEntries', 'workOrder.materialsUsed'
]);
const TABLE_BINDINGS = new Set([
  'workOrder.executionTasks', 'workOrder.laborTimeEntries', 'workOrder.materialsUsed'
]);
const ALLOWED_COMPONENTS = new Set([
  'summary', 'people', 'tasks', 'labor', 'materials', 'signoff', 'comments', 'history',
  'relations', 'customFields', 'attachments'
]);
const plugins = {
  Text: text,
  'Multi-Variable Text': multiVariableText,
  Image: image,
  Signature: signature,
  Table: table,
  Line: line,
  Rectangle: rectangle,
  Ellipse: ellipse,
  'QR Code': barcodes.qrcode
};

function send(response, status, body, contentType = 'application/json') {
  response.writeHead(status, {
    'content-type': contentType,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  });
  response.end(body);
}

async function readJson(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > MAX_BODY_BYTES) throw Object.assign(new Error('payload_too_large'), { status: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('invalid_json'), { status: 400 });
  }
}

function validateRequest(payload) {
  const template = payload?.template;
  const inputs = payload?.inputs;
  if (!template || typeof template !== 'object' || !Array.isArray(template.schemas)
      || !Array.isArray(inputs) || inputs.length === 0 || inputs.length > MAX_INPUTS) {
    throw Object.assign(new Error('invalid_render_request'), { status: 400 });
  }
  if (template.schemas.length > 20 || template.schemas.some((page) => !Array.isArray(page))) {
    throw Object.assign(new Error('invalid_template_pages'), { status: 400 });
  }
  if (template.pdfmeVersion !== '6.2.8' || !template.basePdf || typeof template.basePdf !== 'object'
      || typeof template.basePdf.width !== 'number' || typeof template.basePdf.height !== 'number'
      || !Array.isArray(template.basePdf.padding)) {
    throw Object.assign(new Error('invalid_template_base'), { status: 400 });
  }
  if (template.font !== undefined) {
    const entries = template.font && typeof template.font === 'object' ? Object.entries(template.font) : [];
    if (entries.length !== 1) throw Object.assign(new Error('invalid_template_font'), { status: 400 });
    const [name, font] = entries[0];
    const data = font?.data;
    if (!/^[A-Za-z][A-Za-z0-9 _.\-]{0,39}$/.test(name) || typeof data !== 'string'
        || data.length > 700_000 || !/^data:font\/(ttf|otf);base64,[A-Za-z0-9+/]+={0,2}$/.test(data)
        || (font.fallback !== undefined && typeof font.fallback !== 'boolean')
        || (font.subset !== undefined && typeof font.subset !== 'boolean')) {
      throw Object.assign(new Error('invalid_template_font'), { status: 400 });
    }
    const encoded = data.slice(data.indexOf(',') + 1);
    const bytes = Buffer.from(encoded, 'base64');
    const signature = bytes.subarray(0, 4).toString('latin1');
    if (bytes.length > 512 * 1024 || !['\u0000\u0001\u0000\u0000', 'OTTO', 'true', 'typ1'].includes(signature)) {
      throw Object.assign(new Error('invalid_template_font'), { status: 400 });
    }
  }
  let componentCount = 0;
  const printZoneNames = new Set();
  const schemaNameCounts = new Map();
  let hasConditionalVisibility = false;
  let hasReportZones = false;
  const zoneVisibility = new Map();
  const zonesWithDataBindings = new Set();
  const sectionVisibility = new Map();
  const sectionComponents = new Map();
  for (const page of template.schemas) {
    for (const schema of page) {
      if (typeof schema?.name === 'string') {
        schemaNameCounts.set(schema.name, (schemaNameCounts.get(schema.name) || 0) + 1);
      }
    }
  }
  for (const page of template.schemas) {
    componentCount += page.length;
    if (componentCount > 200 || page.some((schema) => {
      const name = schema?.name;
      if (!ALLOWED_TYPES.has(schema?.type) || typeof name !== 'string'
          || !(name.startsWith('static:') || ALLOWED_BINDINGS.has(name))) return true;
      if (TABLE_BINDINGS.has(name) !== (schema.type === 'table')) return true;
      if (schema.type === 'table' && (!Array.isArray(schema.head) || schema.head.length < 1
          || schema.head.length > 12 || schema.head.some((header) => typeof header !== 'string' || header.length > 100))) return true;
      if (schema.qpmEmptyMessage !== undefined
          && (schema.type !== 'table' || typeof schema.qpmEmptyMessage !== 'string'
            || schema.qpmEmptyMessage.length > 200)) return true;
      if (schema.qpmComponent !== undefined && !ALLOWED_COMPONENTS.has(schema.qpmComponent)) return true;
      if (schema.qpmSectionId !== undefined && (typeof schema.qpmSectionId !== 'string'
          || !/^[A-Za-z0-9_-]{1,80}$/.test(schema.qpmSectionId) || !ALLOWED_COMPONENTS.has(schema.qpmComponent))) return true;
      if (schema.qpmHideComponentIfEmpty !== undefined
          && (schema.qpmHideComponentIfEmpty !== true || typeof schema.qpmSectionId !== 'string')) return true;
      if (schema.qpmHideIfEmpty !== undefined) {
        if (schema.qpmHideIfEmpty !== true || name.startsWith('static:')
            || !['text', 'multiVariableText'].includes(schema.type)) return true;
        hasConditionalVisibility = true;
      }
      if (schema.qpmSectionId !== undefined) {
        const hidden = schema.qpmHideComponentIfEmpty === true;
        if (sectionVisibility.has(schema.qpmSectionId) && sectionVisibility.get(schema.qpmSectionId) !== hidden) return true;
        if (sectionComponents.has(schema.qpmSectionId) && sectionComponents.get(schema.qpmSectionId) !== schema.qpmComponent) return true;
        sectionVisibility.set(schema.qpmSectionId, hidden);
        sectionComponents.set(schema.qpmSectionId, schema.qpmComponent);
      }
      if (schema.qpmPrintZone !== undefined) {
        if (!['HEADER', 'FOOTER', 'REPORT_HEADER', 'REPORT_FOOTER'].includes(schema.qpmPrintZone)
            || ['table', 'signature'].includes(schema.type)
            || schemaNameCounts.get(name) !== 1 || printZoneNames.has(name)) return true;
        if (schema.qpmPrintZone === 'REPORT_HEADER' || schema.qpmPrintZone === 'REPORT_FOOTER') hasReportZones = true;
        printZoneNames.add(name);
        if (schema.qpmPrintZoneHideIfEmpty !== undefined
            && schema.qpmPrintZoneHideIfEmpty !== true) return true;
        const hideZone = schema.qpmPrintZoneHideIfEmpty === true;
        if (zoneVisibility.has(schema.qpmPrintZone) && zoneVisibility.get(schema.qpmPrintZone) !== hideZone) return true;
        zoneVisibility.set(schema.qpmPrintZone, hideZone);
        if (hideZone) hasConditionalVisibility = true;
        if (!name.startsWith('static:')) zonesWithDataBindings.add(schema.qpmPrintZone);
      } else if (schema.qpmPrintZoneHideIfEmpty !== undefined) {
        return true;
      }
      if (schema.type === 'image' && (!(name.startsWith('static:') || name === 'company.logo')
          || schema.content && !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(schema.content))) return true;
      if (schema.type === 'qrcode' && !name.startsWith('static:')) return true;
      if (schema.type === 'signature' && name !== 'workOrder.signature') return true;
      return false;
    })) {
      throw Object.assign(new Error('unsupported_template_schema'), { status: 400 });
    }
  }
  for (const [zone, hideZone] of zoneVisibility) {
    if (hideZone && !zonesWithDataBindings.has(zone)) {
      throw Object.assign(new Error('zone_visibility_requires_data_binding'), { status: 400 });
    }
  }
  // A pdfme multi-input render shares one schema set across every input. The
  // QPM visibility rule is per document, so reject ambiguous batch requests.
  if ((hasConditionalVisibility || hasReportZones) && inputs.length !== 1) {
    throw Object.assign(new Error('conditional_visibility_requires_single_input'), { status: 400 });
  }
  for (const input of inputs) {
    for (const page of template.schemas) {
      for (const schema of page) {
        if (schema.type !== 'table') continue;
        const rowsValue = input?.[schema.name];
        if (rowsValue === undefined) continue;
        if (typeof rowsValue !== 'string') throw Object.assign(new Error('invalid_table_data'), { status: 400 });
        let rows;
        try { rows = JSON.parse(rowsValue); } catch { throw Object.assign(new Error('invalid_table_data'), { status: 400 }); }
        if (!Array.isArray(rows) || rows.length > 2000 || rows.some((row) => !Array.isArray(row)
            || row.length > 12 || row.some((cell) => typeof cell !== 'string' || cell.length > 4000))) {
          throw Object.assign(new Error('table_data_too_large'), { status: 413 });
        }
      }
    }
  }
}

// pdfme repeats basePdf.staticSchema on every physical page, including pages
// created when a dynamic table is split. Keep these schemas in the editor's
// page schemas, then promote their render-time copies to staticSchema here.
function withRepeatedPrintZones(template, inputs) {
  const staticSchema = [];
  const schemas = template.schemas.map((page) => page.filter((schema) => {
    if (!['HEADER', 'FOOTER'].includes(schema.qpmPrintZone)) return true;
    // pdfme's image plugin rejects an empty variable when it is promoted to
    // basePdf.staticSchema. Keep an optional company logo out of the repeated
    // header when no company has supplied one.
    if (schema.type === 'image' && inputs.every((input) => {
      const value = input?.[schema.name];
      return typeof value !== 'string' || value.trim() === '';
    })) return false;
    const copy = { ...schema, readOnly: true };
    delete copy.qpmPrintZone;
    if (!copy.name.startsWith('static:')) copy.content = `{${copy.name}}`;
    staticSchema.push(copy);
    return false;
  }));
  if (staticSchema.length === 0) return template;
  return { ...template, basePdf: { ...template.basePdf, staticSchema }, schemas };
}

function extractReportZones(template) {
  const reportHeader = [];
  const reportFooter = [];
  const schemas = template.schemas.map((page) => page.filter((schema) => {
    if (schema.qpmPrintZone === 'REPORT_HEADER') {
      reportHeader.push(schema);
      return false;
    }
    if (schema.qpmPrintZone === 'REPORT_FOOTER') {
      reportFooter.push(schema);
      return false;
    }
    return true;
  }));
  return { template: { ...template, schemas }, reportHeader, reportFooter };
}

function withConditionalVisibility(template, input) {
  const sections = new Map();
  for (const schema of template.schemas.flat()) {
    if (schema.qpmHideComponentIfEmpty !== true) continue;
    const members = sections.get(schema.qpmSectionId) || [];
    members.push(schema);
    sections.set(schema.qpmSectionId, members);
  }
  const hiddenSections = new Set();
  for (const [sectionId, members] of sections) {
    const dataSchemas = members.filter((schema) => !schema.name.startsWith('static:'));
    const isEmpty = (schema) => {
      const value = input[schema.name];
      if (value === undefined || value === null) return true;
      if (schema.type === 'table') {
        if (typeof value !== 'string') return false;
        try { return JSON.parse(value).length === 0; } catch { return true; }
      }
      return typeof value === 'string' && value.trim().length === 0;
    };
    if (dataSchemas.length === 0 || dataSchemas.every(isEmpty)) hiddenSections.add(sectionId);
  }
  const schemas = template.schemas.map((page) => page.filter((schema) => {
    if (schema.qpmSectionId && hiddenSections.has(schema.qpmSectionId)) return false;
    if (schema.qpmHideIfEmpty !== true) return true;
    const value = input[schema.name];
    return value !== undefined && value !== null
      && (typeof value !== 'string' || value.trim().length > 0);
  }));
  return { ...template, schemas };
}

function withPrintZoneVisibility(template, input) {
  const byZone = new Map();
  for (const schema of template.schemas.flat()) {
    if (!schema.qpmPrintZone || schema.qpmPrintZoneHideIfEmpty !== true) continue;
    const members = byZone.get(schema.qpmPrintZone) || [];
    members.push(schema);
    byZone.set(schema.qpmPrintZone, members);
  }
  const isEmpty = (schema) => {
    const value = input[schema.name];
    if (value === undefined || value === null) return true;
    return typeof value === 'string' && value.trim().length === 0;
  };
  const hiddenZones = new Set([...byZone.entries()]
    .filter(([, members]) => {
      const dataSchemas = members.filter((schema) => !schema.name.startsWith('static:'));
      return dataSchemas.length > 0 && dataSchemas.every(isEmpty);
    })
    .map(([zone]) => zone));
  const schemas = template.schemas.map((page) => page.filter((schema) =>
    !hiddenZones.has(schema.qpmPrintZone)));
  return { ...template, schemas };
}

function withEmptyTableMessages(template, inputs) {
  const tables = template.schemas.flat().filter((schema) => schema.type === 'table'
    && typeof schema.qpmEmptyMessage === 'string' && schema.qpmEmptyMessage.trim());
  if (tables.length === 0) return inputs;
  return inputs.map((input) => {
    let next = input;
    for (const schema of tables) {
      const rawRows = next[schema.name];
      const rows = rawRows === undefined ? [] : JSON.parse(rawRows);
      if (rows.length > 0) continue;
      if (next === input) next = { ...input };
      next[schema.name] = JSON.stringify([Array.from({ length: schema.head.length }, (_, index) =>
        index === 0 ? schema.qpmEmptyMessage.trim() : '')]);
    }
    return next;
  });
}

function withoutQpmRenderOptions(template) {
  const schemas = template.schemas.map((page) => page.map((schema) => {
    if (schema.qpmEmptyMessage === undefined && schema.qpmHideIfEmpty === undefined
        && schema.qpmComponent === undefined && schema.qpmSectionId === undefined
        && schema.qpmHideComponentIfEmpty === undefined && schema.qpmPrintZone === undefined
        && schema.qpmPrintZoneHideIfEmpty === undefined) return schema;
    const { qpmEmptyMessage, qpmHideIfEmpty, qpmComponent, qpmSectionId,
      qpmHideComponentIfEmpty, qpmPrintZone, qpmPrintZoneHideIfEmpty, ...pdfmeSchema } = schema;
    return pdfmeSchema;
  }));
  const pdfmeTemplate = { ...template };
  delete pdfmeTemplate.qpmPrintZoneHeights;
  return { ...pdfmeTemplate, schemas };
}

async function renderReportZoneOverlay(sourceTemplate, schemas, input, plugins) {
  if (schemas.length === 0) return null;
  const basePdf = { ...sourceTemplate.basePdf };
  delete basePdf.staticSchema;
  const template = withoutQpmRenderOptions({
    ...sourceTemplate,
    basePdf,
    schemas: [schemas]
  });
  return Buffer.from(await generate({
    template,
    inputs: [input],
    plugins,
    options: { font: sourceTemplate.font }
  }));
}

async function applyReportZoneOverlays(pdfBytes, sourceTemplate, reportHeader, reportFooter, input, plugins) {
  if (reportHeader.length === 0 && reportFooter.length === 0) return pdfBytes;
  const document = await PDFDocument.load(pdfBytes);
  const pages = document.getPages();
  if (pages.length === 0) return pdfBytes;
  const overlays = [
    { schemas: reportHeader, page: pages[0] },
    { schemas: reportFooter, page: pages[pages.length - 1] }
  ];
  for (const overlay of overlays) {
    if (overlay.schemas.length === 0) continue;
    const bytes = await renderReportZoneOverlay(sourceTemplate, overlay.schemas, input, plugins);
    const overlayDocument = await PDFDocument.load(bytes);
    const [embeddedPage] = await document.embedPages([overlayDocument.getPage(0)]);
    overlay.page.drawPage(embeddedPage, {
      x: 0,
      y: 0,
      width: overlay.page.getWidth(),
      height: overlay.page.getHeight()
    });
  }
  return Buffer.from(await document.save());
}

function matchesToken(received) {
  if (!TOKEN || typeof received !== 'string') return false;
  const expectedBytes = Buffer.from(TOKEN);
  const receivedBytes = Buffer.from(received);
  return expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes);
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    return send(response, 200, JSON.stringify({ status: 'ok', enabled: Boolean(TOKEN) }));
  }
  if (request.method !== 'POST' || request.url !== '/render') {
    return send(response, 404, JSON.stringify({ error: 'not_found' }));
  }
  if (!TOKEN) return send(response, 503, JSON.stringify({ error: 'renderer_not_configured' }));
  if (!matchesToken(request.headers['x-qpm-pdfme-token'])) {
    return send(response, 401, JSON.stringify({ error: 'unauthorized' }));
  }
  if (activeRenders >= MAX_CONCURRENT_RENDERS) {
    return send(response, 429, JSON.stringify({ error: 'renderer_busy' }));
  }

  activeRenders += 1;
  try {
    const payload = await readJson(request);
    validateRequest(payload);
    const templateWithZoneVisibility = withPrintZoneVisibility(payload.template, payload.inputs[0]);
    const templateWithVisibility = withConditionalVisibility(templateWithZoneVisibility, payload.inputs[0]);
    const { template: templateWithoutReportZones, reportHeader, reportFooter } = extractReportZones(templateWithVisibility);
    const templateWithPrintZones = withRepeatedPrintZones(templateWithoutReportZones, payload.inputs);
    const inputs = withEmptyTableMessages(templateWithPrintZones, payload.inputs);
    const template = withoutQpmRenderOptions(templateWithPrintZones);
    const renderedPdf = await generate({ template, inputs, plugins, options: { font: payload.template.font } });
    const pdfBuffer = await applyReportZoneOverlays(
      Buffer.from(renderedPdf), payload.template, reportHeader, reportFooter, inputs[0], plugins);
    if (pdfBuffer.length > MAX_PDF_BYTES) return send(response, 413, JSON.stringify({ error: 'pdf_too_large' }));
    return send(response, 200, pdfBuffer, 'application/pdf');
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 422;
    // Keep template data and user-entered values out of logs and responses.
    const errorCode = status === 400 ? 'invalid_render_request'
      : status === 413 ? 'payload_too_large'
        : 'render_failed';
    process.stderr.write(`PDFME render failed (${status}): ${errorCode}\n`);
    return send(response, status, JSON.stringify({ error: errorCode }));
  } finally {
    activeRenders -= 1;
  }
});

server.requestTimeout = 30_000;
server.headersTimeout = 35_000;
server.listen(PORT, '0.0.0.0', () => {
  process.stdout.write(`PDFME renderer listening on ${PORT}\n`);
});
