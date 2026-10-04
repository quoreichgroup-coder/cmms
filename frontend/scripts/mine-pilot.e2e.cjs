// Run only against an isolated pilot prepared with real users and a signed license.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.QPM_PLAYWRIGHT_MODULE || 'playwright');
const fixturePath = process.env.QPM_PILOT_FIXTURE;
assert.ok(fixturePath, 'QPM_PILOT_FIXTURE must point to the isolated pilot fixture');
const f = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const base = process.env.QPM_PILOT_URL || 'http://127.0.0.1:3410';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Use a local isolated pilot');
const artifacts = process.env.QPM_PILOT_ARTIFACTS || path.join(path.dirname(fixturePath), 'screenshots');
fs.mkdirSync(artifacts, { recursive: true });
const results = [];
let browser;
async function check(name, run) {
  await run(); results.push(name); console.log('PASS', name);
}
async function context() {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.route('**/*', route => {
    const host = new URL(route.request().url()).hostname;
    return ['localhost', '127.0.0.1'].includes(host) ? route.continue() : route.abort();
  });
  return ctx;
}
async function login(ctx, email) {
  const page = await ctx.newPage();
  await page.goto(base + '/app/work-orders', { waitUntil: 'domcontentloaded' });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(f.password);
  const [response] = await Promise.all([
    page.waitForResponse(r => r.url().endsWith('/auth/signin')),
    page.locator('button[type="submit"]').click()
  ]);
  assert.equal(response.status(), 200);
  await page.locator('input[name="password"]').waitFor({ state: 'detached' });
  const auth = await response.json();
  return { page, token: auth.accessToken, ctx };
}
async function api(session, method, route, data) {
  const response = await session.ctx.request.fetch(base + '/api/' + route, {
    method, headers: { Authorization: 'Bearer ' + session.token }, data
  });
  assert.ok(response.ok(), `${method} ${route}: HTTP ${response.status()}`);
  return response.json();
}
async function goto(page, route) {
  await page.goto(base + route, { waitUntil: 'domcontentloaded' });
}
async function changeStatus(page, from, to) {
  await page.getByRole('button', { name: from, exact: true }).first().click();
  await page.getByRole('option', { name: to, exact: true }).click();
}

(async () => {
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const owner = await login(await context(), 'responsable@pilot.test');
  await check('connexion responsable et licence signée active', async () => {
    const state = await api(owner, 'GET', 'license/state');
    assert.equal(state.valid, true); assert.equal(state.previewMode, false);
    assert.equal(state.readOnly, false); assert.equal(state.environment, 'PREPRODUCTION');
  });

  const page = owner.page;
  await check('fiche convoyeur : échéances triées, plan désactivé masqué, zéro et absence de relevé', async () => {
    const errors = [];
    const listener = r => { if (r.url().includes('/api/') && r.status() >= 500) errors.push(r.status()); };
    page.on('response', listener);
    await goto(page, '/app/assets/' + f.asset.id + '/overview');
    await page.getByText(/Dernier relevé: 0 h/).waitFor();
    await page.getByText(/Aucun relevé enregistré/).waitFor();
    await page.getByRole('link', { name: 'Roulement — pilote', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: "Planifier l'ordre de travail", exact: true }).count(), 1);
    const planNames = await page.locator('a').filter({ hasText: /Inspection .* — pilote/ }).allTextContents();
    assert.deepEqual(planNames, ['Inspection prochaine — pilote', 'Inspection tardive — pilote']);
    assert.equal(await page.getByText('Inspection désactivée — pilote', { exact: true }).count(), 0);
    assert.deepEqual(errors, []);
    page.off('response', listener);
    await page.screenshot({ path: path.join(artifacts, 'convoyeur-desktop.png'), fullPage: true });
  });

  await check('pagination des demandes et lien vers l’ordre approuvé', async () => {
    const [response] = await Promise.all([
      page.waitForResponse(r => r.url().endsWith('/requests/search') && r.request().postDataJSON()?.pageNum === 1),
      page.locator('button[aria-label="Go to page 2"]').click()
    ]);
    assert.equal(response.status(), 200);
    const body = await response.json();
    assert.ok(body.content.length <= 4);
    const original = body.content.find(r => r.id === f.request.id);
    assert.equal(original.workOrder.id, f.workOrder.id);
    await page.getByRole('link', { name: /Bruit sur entraînement CV-PILOTE-01/ }).waitFor();
    assert.ok((await page.locator('body').innerText()).includes('Approuvé'));
  });

  await check('emplacement exact dans la liste des demandes', async () => {
    await goto(page, '/app/requests/' + f.request.id);
    const row = page.locator('tr').filter({ hasText: 'Bruit sur entraînement CV-PILOTE-01' });
    await row.waitFor();
    assert.ok((await row.innerText()).includes('Zone de traitement — pilote'));
  });

  const technician = await login(await context(), 'technicien@pilot.test');
  const tech = technician.page;
  await check('technicien : intervention en cours, diagnostic et tâche réalisée', async () => {
    await goto(tech, '/app/work-orders/' + f.workOrder.id);
    await tech.getByText('Diagnostic du convoyeur — pilote', { exact: true }).waitFor();
    const current = await api(technician, 'GET', 'work-orders/' + f.workOrder.id);
    if (current.status === 'OPEN') {
      const [response] = await Promise.all([
        tech.waitForResponse(r => r.url().endsWith('/change-status')),
        changeStatus(tech, 'Ouvert', 'En cours')
      ]);
      assert.equal(response.status(), 200);
    }
    const diagnosisTask = f.tasks.find(task => task.taskBase.taskType === 'TEXT');
    const diagnosisState = await api(technician, 'GET', 'tasks/' + diagnosisTask.id);
    if (!diagnosisState.value?.includes('diagnostic pilote')) {
      const diagnosisBox = tech.getByText('Diagnostic du convoyeur — pilote', { exact: true }).locator('..');
      const [diagnostic] = await Promise.all([
        tech.waitForResponse(r => r.url().endsWith('/tasks/' + diagnosisTask.id) && r.request().method() === 'PATCH'),
        diagnosisBox.getByRole('textbox').fill('Jeu constaté sur roulement — diagnostic pilote')
      ]);
      assert.equal(diagnostic.status(), 200);
    }
    const workTask = f.tasks.find(task => task.taskBase.taskType === 'SUBTASK');
    const taskState = await api(technician, 'GET', 'tasks/' + workTask.id);
    if (taskState.value !== 'COMPLETE') {
      const taskBox = tech.getByText('Travail réalisé — pilote', { exact: true }).locator('..');
      await taskBox.getByRole('button').click();
      const [response] = await Promise.all([
        tech.waitForResponse(r => r.url().endsWith('/tasks/' + workTask.id) && r.request().method() === 'PATCH'),
        tech.getByRole('option', { name: 'Terminé', exact: true }).click()
      ]);
      assert.equal(response.status(), 200);
    }
  });

  await check('temps saisi et pièce consommée sur l’ordre réel', async () => {
    const wo = f.workOrder.id;
    if (!f.labor) {
      f.labor = await api(technician, 'POST', 'labors', {
        workOrder: { id: wo }, assignedTo: { id: f.technician.id },
        duration: 1800, startedAt: new Date().toISOString(), includeToTotalTime: true, hourlyRate: 40
      });
      fs.writeFileSync(fixturePath, JSON.stringify(f));
    }
    const quantities = await api(technician, 'PATCH', 'part-quantities/work-order/' + wo, [f.part.id]);
    assert.equal(quantities[0].quantity, 1);
    const part = await api(owner, 'GET', 'parts/' + f.part.id);
    assert.equal(part.quantity, 9);
    const labor = await api(technician, 'GET', 'labors/' + f.labor.id);
    assert.equal(labor.duration, 1800);
    await goto(tech, '/app/work-orders/' + wo);
    await tech.getByText('Roulement — pilote', { exact: true }).waitFor();
  });

  await check('responsable : clôture avec retour obligatoire et historique conservé', async () => {
    await goto(page, '/app/work-orders/' + f.workOrder.id);
    await page.getByText('Roulement — pilote', { exact: true }).waitFor();
    const current = await api(owner, 'GET', 'work-orders/' + f.workOrder.id);
    if (current.status !== 'COMPLETE') {
      await changeStatus(page, 'En cours', 'Terminé');
      const dialog = page.getByRole('dialog').last();
      await dialog.getByRole('textbox').fill('Diagnostic vérifié, travail et pièces enregistrés — clôture du pilote.');
      const [response] = await Promise.all([
        page.waitForResponse(r => r.url().endsWith('/change-status')),
        dialog.getByRole('button', { name: 'Fermer', exact: true }).click()
      ]);
      assert.equal(response.status(), 200);
    }
    const closed = await api(owner, 'GET', 'work-orders/' + f.workOrder.id);
    assert.equal(closed.status, 'COMPLETE'); assert.ok(closed.completedOn);
    assert.ok(closed.feedback.includes('clôture du pilote'));
    const request = await api(owner, 'GET', 'requests/' + f.request.id);
    assert.equal(request.workOrder.id, closed.id);
    const tasks = await api(owner, 'GET', 'tasks/work-order/' + closed.id);
    assert.ok(tasks.find(t => t.value === 'COMPLETE'));
    assert.ok(tasks.find(t => t.value?.includes('diagnostic pilote')));
    await page.screenshot({ path: path.join(artifacts, 'intervention-cloturee.png'), fullPage: true });
  });

  const requester = await login(await context(), 'demandeur@pilot.test');
  await check('demandeur : création permise et approbation refusée par le serveur', async () => {
    if (!f.requesterRequest) {
      f.requesterRequest = await api(requester, 'POST', 'requests', {
        title: 'Signalement du demandeur — pilote', asset: { id: f.asset.id }
      });
      fs.writeFileSync(fixturePath, JSON.stringify(f));
    }
    const denied = await requester.ctx.request.patch(base + '/api/requests/' + f.requesterRequest.id + '/approve', {
      headers: { Authorization: 'Bearer ' + requester.token }, data: {}
    });
    assert.equal(denied.status(), 403);
    await goto(requester.page, '/app/requests/' + f.requesterRequest.id);
    await requester.page.getByText('Signalement du demandeur — pilote', { exact: true }).last().waitFor();
    assert.equal(await requester.page.getByRole('button', { name: 'Approuver', exact: true }).count(), 0);
  });

  await check('une pièce d’une autre organisation reste inaccessible après le correctif des identifiants', async () => {
    if (!f.foreignPart) {
      const signup = await owner.ctx.request.post(base + '/api/auth/signup', { data: {
        email: 'autre-organisation@pilot.test', password: f.password,
        firstName: 'Autre', lastName: 'Organisation', phone: '',
        companyName: 'Autre organisation — test isolation', employeesCount: 1, language: 'FR'
      } });
      assert.equal(signup.status(), 200);
      const signin = await owner.ctx.request.post(base + '/api/auth/signin', {
        data: { email: 'autre-organisation@pilot.test', password: f.password }
      });
      assert.equal(signin.status(), 200);
      const auth = await signin.json();
      const created = await owner.ctx.request.post(base + '/api/parts', {
        headers: { Authorization: 'Bearer ' + auth.accessToken },
        data: { name: 'Pièce autre organisation — pilote', quantity: 5, cost: 10 }
      });
      assert.equal(created.status(), 200);
      f.foreignPart = await created.json();
      fs.writeFileSync(fixturePath, JSON.stringify(f));
    }
    const denied = await owner.ctx.request.patch(base + '/api/part-quantities/work-order/' + f.workOrder.id, {
      headers: { Authorization: 'Bearer ' + owner.token }, data: [f.part.id, f.foreignPart.id]
    });
    assert.equal(denied.status(), 403);
    const associated = await api(owner, 'GET', 'part-quantities/work-order/' + f.workOrder.id);
    assert.equal(associated.length, 1);
    assert.equal(associated[0].part.id, f.part.id);
    assert.equal((await api(owner, 'GET', 'parts/' + f.part.id)).quantity, 9);
  });

  await check('fiche convoyeur responsive et ordre clôturé retrouvé', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await goto(page, '/app/assets/' + f.asset.id + '/overview');
    await page.getByText(/Dernier relevé: 0 h/).waitFor();
    await page.getByRole('button', { name: /^Bruit sur entraînement CV-PILOTE-01/ }).waitFor();
    assert.equal(await page.getByRole('button', { name: "Planifier l'ordre de travail", exact: true }).count(), 1);
    const sizes = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    assert.ok(sizes.scroll <= sizes.width + 1, 'Horizontal overflow: ' + JSON.stringify(sizes));
    const title = page.getByRole('heading', { name: f.asset.name, level: 2, exact: true });
    const titleBounds = await title.boundingBox();
    assert.ok(titleBounds.y >= 0 && titleBounds.height < 50, 'The header title must fit on one line');
    assert.equal(await title.evaluate(el => getComputedStyle(el).whiteSpace), 'nowrap');
    await page.screenshot({ path: path.join(artifacts, 'convoyeur-mobile.png'), fullPage: true });
    await page.screenshot({ path: path.join(artifacts, 'convoyeur-mobile-ecran.png') });
  });
  fs.writeFileSync(path.join(artifacts, 'results.json'), JSON.stringify({ checks: results, passed: results.length }, null, 2));
  await browser.close();
  console.log(`${results.length} vérifications métier réussies`);
})().catch(async error => {
  console.error(error.message);
  if (browser) {
    const pages = browser.contexts().flatMap(ctx => ctx.pages());
    for (let i = 0; i < pages.length; i++) {
      await pages[i].screenshot({ path: path.join(artifacts, 'failure-' + i + '.png'), fullPage: true }).catch(() => {});
      fs.writeFileSync(path.join(artifacts, 'failure-' + i + '.txt'), await pages[i].locator('body').innerText().catch(() => ''));
    }
    await browser.close();
  }
  process.exitCode = 1;
});
