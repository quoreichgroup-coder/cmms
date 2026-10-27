import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { once } from 'node:events';
import { image, table } from '@pdfme/schemas';
import { PDFME_VERSION } from '@pdfme/common';
import { PDFDocument } from 'pdf-lib';

async function freePort() {
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function waitForHealth(url, child) {
  // pdfme's generator and plugin modules have a noticeable cold-start on small
  // CI/VPS runners; allow time for one-off module evaluation before failing.
  for (let attempt = 0; attempt < 300; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`renderer exited (${child.exitCode})`);
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) return;
    } catch { /* Wait for the local server to start. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('renderer health check timed out');
}

test('protects PDF rendering and generates a multi-page Work Order PDF', async (t) => {
  const port = await freePort();
  const token = 'qpm-pdfme-renderer-test-token-0123456789abcdef';
  const child = spawn(process.execPath, ['src/server.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, PORT: String(port), PDFME_RENDERER_TOKEN: token },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  t.after(() => child.kill('SIGTERM'));
  const url = `http://127.0.0.1:${port}`;
  await waitForHealth(url, child);

  const headers = { 'content-type': 'application/json', 'x-qpm-pdfme-token': token };
  const unauthorized = await fetch(`${url}/render`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ template: {}, inputs: [{}] })
  });
  assert.equal(unauthorized.status, 401);

  const tableSchema = {
    ...table.propPanel.defaultSchema,
    name: 'workOrder.executionTasks',
    position: { x: 10, y: 220 },
    width: 190,
    height: 30,
    head: ['Step', 'Operation', 'Result', 'Notes'],
    headWidthPercentages: [10, 40, 20, 30],
    repeatHead: true,
    content: '[]'
  };
  const line = (name, content, y, x = 10, width = 190) => ({ name, type: 'text', content, position: { x, y }, width, height: 9, fontSize: 10 });
  const template = {
    pdfmeVersion: PDFME_VERSION,
    basePdf: { width: 210, height: 297, padding: [10, 10, 10, 10] },
    schemas: [
      [
        { ...image.propPanel.defaultSchema, name: 'company.logo', content: '', position: { x: 10, y: 10 }, width: 24, height: 24 },
        line('company.name', 'Company', 10, 38, 164),
        line('company.legalName', 'Registered legal name', 18, 38, 164),
        line('company.registeredAddress', 'Registered address', 26, 10, 110),
        line('company.registrationNumber', 'Registration number', 26, 125, 75),
        line('company.taxNumber', 'Tax ID', 26, 206, 79),
        line('workOrder.customId', 'WO-00000', 22),
        line('workOrder.title', 'Maintenance Job Card', 34),
        line('asset.name', 'Asset / equipment', 46),
        line('location.name', 'Functional location', 58),
        line('site.name', 'Site', 70),
        { ...tableSchema, position: { x: 10, y: 90 } }
      ],
      [{ ...table.propPanel.defaultSchema, name: 'workOrder.laborTimeEntries', position: { x: 10, y: 50 }, width: 190, height: 30, head: ['Technician', 'Activity', 'Started', 'Hours', 'Status'], headWidthPercentages: [24, 22, 22, 16, 16], repeatHead: true, content: '[]' }],
      [{ ...table.propPanel.defaultSchema, name: 'workOrder.materialsUsed', position: { x: 10, y: 50 }, width: 190, height: 30, head: ['Part', 'Description', 'Quantity', 'Unit'], headWidthPercentages: [24, 48, 16, 12], repeatHead: true, content: '[]' }],
      [
        line('static:safety_title', 'Safety instructions', 20),
        line('static:execution_notes_title', 'Execution notes', 50),
        line('workOrder.feedback', 'Work order feedback', 62),
        line('workOrder.completedBy', 'Completed by', 90),
        line('static:supervisor_approval', 'Supervisor approval / signature', 130)
      ]
    ]
  };
  const rows = Array.from({ length: 45 }, (_, index) => [
    String(index + 1),
    `Maintenance operation ${index + 1}`,
    'Completed',
    'Inspected and recorded'
  ]);
  const laborRows = [['A. Traore', 'Inspection', '2026-10-22T07:00:00Z', '1.50', 'STOPPED']];
  const materialRows = [['BRG-6205', 'Bearing 6205', '2', 'each']];
  const response = await fetch(`${url}/render`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ template, inputs: [{
      'company.name': 'QPM Sample Industrial Services',
      'company.logo': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWmsAAAAASUVORK5CYII=',
      'company.legalName': 'QPM Sample Industrial Services SA',
      'company.registeredAddress': 'Zone Industrielle, Abidjan, Côte d’Ivoire',
      'company.registrationNumber': 'CI-ABJ-2026-B-24810',
      'company.taxNumber': 'TAX-CI-24810',
      'workOrder.customId': 'WO-24810',
      'workOrder.title': 'Inspect and service transfer pump P-204',
      'asset.name': 'Transfer pump P-204 · SN-204-7781',
      'location.name': 'Plant 1 / Utilities / Pump gallery',
      'site.name': 'Abidjan Plant',
      'workOrder.executionTasks': JSON.stringify(rows),
      'workOrder.laborTimeEntries': JSON.stringify(laborRows),
      'workOrder.materialsUsed': JSON.stringify(materialRows),
      'workOrder.feedback': 'Seal inspected and vibration reading recorded.',
      'workOrder.completedBy': 'A. Traore'
    }] })
  });
  if (!response.ok) assert.fail(`render returned ${response.status}: ${await response.text()} ${stderr}`);
  assert.match(response.headers.get('content-type') || '', /application\/pdf/);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(bytes.subarray(0, 4).toString('ascii'), '%PDF');
  const parsedPdf = await PDFDocument.load(bytes);
  const pageCount = parsedPdf.getPageCount();
  assert.ok(pageCount > 4, `expected Work Order sections and table continuation pages, saw ${pageCount} page(s)`);
  if (process.env.PDFME_EVIDENCE_PATH) {
    await mkdir(dirname(process.env.PDFME_EVIDENCE_PATH), { recursive: true });
    await writeFile(process.env.PDFME_EVIDENCE_PATH, bytes);
  }
});
