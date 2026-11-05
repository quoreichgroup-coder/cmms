const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) =>
  fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('procurement templates use the native document editor and preserve required output fields', () => {
  const editor = read(
    'src/content/own/Settings/Documents/DocumentTemplates.tsx'
  );
  assert.match(editor, /'PURCHASE_ORDER', 'PURCHASE_REQUISITION'/);
  assert.match(editor, /purchaseOrder\.lines/);
  assert.match(editor, /purchaseRequisition\.lines/);
  assert.match(editor, /preview-procurement-pdf/);
});

test('desktop print action uses archived server documents and blocks unapproved PO issue', () => {
  const actions = read(
    'src/content/own/components/ProcurementDocumentModal.tsx'
  );
  const poDetails = read(
    'src/content/own/PurchaseOrders/PurchaseOrderDetails.tsx'
  );
  const prList = read('src/content/own/PurchaseRequisitions/index.tsx');
  assert.match(actions, /documents\/issue\/\$\{selected\}/);
  assert.match(actions, /documents\/\$\{doc\.id\}\/download/);
  assert.match(actions, /documents\/preview\/\$\{selected\}/);
  assert.match(poDetails, /purchaseOrder\.status !== 'APPROVED'/);
  assert.match(
    prList,
    /issueDisabled=\{row\.requesterId !== user\?\.id && !canEditOther\}/
  );
  assert.match(actions, /procurement_issue_requires_approval/);
});

test('procurement CSV exports preserve supplier prices and neutralize spreadsheet formulas', () => {
  const csv = read('src/utils/csv.ts');
  const purchaseOrders = read('src/content/own/PurchaseOrders/index.tsx');
  const requisitions = read('src/content/own/PurchaseRequisitions/index.tsx');
  assert.ok(csv.includes('if (/^[\\s]*[=+@-]/.test(text)'));
  assert.ok(csv.includes('text.replace(/"/g, \'""\')'));
  assert.match(purchaseOrders, /'purchaseUnitPrice', 'purchasePriceCurrency'/);
  assert.match(purchaseOrders, /downloadCsv\(`purchase-orders-/);
  assert.match(requisitions, /downloadCsv\(`purchase-requisitions-/);
});

test('procurement lines carry site assignments through web entry, mobile PR entry, conversion, and print', () => {
  const selector = read('src/content/own/components/form/SelectPartQuantities.tsx');
  const rows = read('src/content/own/components/PartQuantitiesList.tsx');
  const requisitions = read('src/content/own/PurchaseRequisitions/index.tsx');
  const purchaseOrders = read('src/content/own/PurchaseOrders/index.tsx');
  const requisitionApi = fs.readFileSync(path.join(__dirname, '../../api/src/main/java/com/grash/controller/PurchaseRequisitionController.java'), 'utf8');
  const purchaseOrderApi = fs.readFileSync(path.join(__dirname, '../../api/src/main/java/com/grash/controller/PurchaseOrderController.java'), 'utf8');
  const approvalService = fs.readFileSync(path.join(__dirname, '../../api/src/main/java/com/grash/service/ProcurementApprovalService.java'), 'utf8');
  const migration = fs.readFileSync(path.join(__dirname, '../../api/src/main/resources/db/changelog/2026_11_05_00000000001_procurement_line_sites.xml'), 'utf8');
  const mobile = fs.readFileSync(path.join(__dirname, '../../mobile/screens/purchaseRequisitions/PurchaseRequisitionsScreen.tsx'), 'utf8');
  assert.match(selector, /api\.get<SiteOption\[]>\('sites'\)/);
  assert.match(rows, /onSiteChange/);
  assert.match(requisitions, /siteId: line\.siteId/);
  assert.match(requisitions, /line\.siteName && <Typography variant="caption"/);
  assert.match(purchaseOrders, /'siteId', 'siteName'/);
  assert.match(requisitionApi, /orderLine\.setSite\(line\.getSite\(\)\)/);
  assert.match(requisitionApi, /setSiteId\(siteId\)/);
  assert.match(purchaseOrderApi, /line\.setSiteId\(siteId\)/);
  assert.match(purchaseOrderApi, /!row\.isMapped\(name\)/);
  assert.match(approvalService, /hiddenRequisition/);
  assert.match(approvalService, /hiddenOrderLine/);
  assert.match(migration, /purchase_requisition_line_site/);
  assert.match(mobile, /siteId: line\.siteId/);
  assert.match(mobile, /select_site/);
});

test('purchase order categories in use cannot be deleted and show a translated conflict', () => {
  const service = fs.readFileSync(
    path.join(
      __dirname,
      '../../api/src/main/java/com/grash/service/PurchaseOrderCategoryService.java'
    ),
    'utf8'
  );
  const repository = fs.readFileSync(
    path.join(
      __dirname,
      '../../api/src/main/java/com/grash/repository/PurchaseOrderRepository.java'
    ),
    'utf8'
  );
  const categories = read('src/content/own/Categories/CategoriesLayout.tsx');
  const english = read('src/i18n/translations/en.ts');
  const french = read('src/i18n/translations/fr.ts');
  assert.match(repository, /existsByCategory_IdAndCompany_Id/);
  assert.match(service, /purchase_order_category_in_use/);
  assert.match(
    categories,
    /t\(getErrorMessage\(err, 'category_delete_failure'\)\)/
  );
  assert.match(
    english,
    /purchase_order_category_in_use:[\s\S]*?cannot be deleted/
  );
  assert.match(
    french,
    /purchase_order_category_in_use:[\s\S]*?ne peut pas être supprimée/
  );
});

test('approval policy administration lives under Settings and old URLs redirect', () => {
  const settings = read('src/router/app.tsx');
  const tabs = read('src/content/own/Settings/SettingsLayout.tsx');
  const sidebar = read(
    'src/layouts/ExtendedSidebarLayout/Sidebar/SidebarMenu/items.ts'
  );
  assert.match(settings, /settings\/approval-management\/policies/);
  assert.match(tabs, /value: 'approval-management'/);
  assert.doesNotMatch(sidebar, /name: 'ap_management'/);
});

test('optional approval levels are explicit in policy editing, preview and progress', () => {
  const editor = read(
    'src/content/own/ApprovalManagement/ApprovalPolicyEditor.tsx'
  );
  const preview = read(
    'src/content/own/ApprovalManagement/WorkflowPreview.tsx'
  );
  const progress = read(
    'src/content/own/ApprovalManagement/ApprovalProgress.tsx'
  );
  const translations = read('src/i18n/translations/approvalManagement.ts');
  assert.match(editor, /required: event\.target\.checked/);
  assert.match(
    editor,
    /validation && !policy\.levels\.some\(level => level\.required !== false\)/
  );
  assert.match(editor, /level\.required !== false && !level\.approverId/);
  assert.match(
    preview,
    /level\.required === false[\s\S]*?ap_optional_level_skipped/
  );
  assert.match(
    progress,
    /level\.required === false \? t\('ap_optional_level_skipped'\)/
  );
  assert.match(translations, /facultatives sont ignorées automatiquement/);
  assert.match(translations, /optional levels are skipped automatically/);
});

test('archived document access history is company-scoped and available to settings readers', () => {
  const page = read(
    'src/content/own/Settings/Documents/DocumentAccessHistory.tsx'
  );
  const settings = read('src/content/own/Settings/SettingsLayout.tsx');
  const routes = read('src/router/app.tsx');
  const controller = fs.readFileSync(
    path.join(
      __dirname,
      '../../api/src/main/java/com/grash/controller/GeneratedDocumentController.java'
    ),
    'utf8'
  );
  const service = fs.readFileSync(
    path.join(
      __dirname,
      '../../api/src/main/java/com/grash/service/GeneratedDocumentAccessEventService.java'
    ),
    'utf8'
  );
  assert.match(page, /settings\/generated-document-access/);
  assert.match(page, /sourceType/);
  assert.match(page, /outcome/);
  assert.match(settings, /document-access-history/);
  assert.match(routes, /path: 'document-access-history'/);
  assert.match(
    controller,
    /getViewPermissions\(\)\.contains\(PermissionEntity\.SETTINGS\)/
  );
  assert.match(service, /root\.get\("company"\)\.get\("id"\)/);
});

test('legacy PR approval editor is disabled after policy management is activated', () => {
  const legacyEditor = read(
    'src/content/own/Settings/Features/Workflows/PurchaseRequisitionApproval.tsx'
  );
  const controller = fs.readFileSync(
    path.join(
      __dirname,
      '../../api/src/main/java/com/grash/controller/PurchaseRequisitionController.java'
    ),
    'utf8'
  );
  assert.match(legacyEditor, /config\.policyManagementEnabled/);
  assert.match(legacyEditor, /!policyManagementEnabled/);
  assert.match(legacyEditor, /pr_approval_managed_externally/);
  assert.match(legacyEditor, /width: \{ xs: '100%', sm: 'auto' \}/);
  assert.match(controller, /hasActivatedPolicy\("PR"/);
});

test('approval lists and condition controls reflow through tablet widths', () => {
  const list = read('src/content/own/ApprovalManagement/index.tsx');
  const editor = read(
    'src/content/own/ApprovalManagement/ApprovalPolicyEditor.tsx'
  );
  assert.match(list, /breakpoints\.down\('lg'\)/);
  assert.match(editor, /gridTemplateColumns: \{ xs: '1fr', lg:/);
});

test('blocked approvals can be reassigned from PR/PO screens by a settings editor with an audit reason', () => {
  const progress = read(
    'src/content/own/ApprovalManagement/ApprovalProgress.tsx'
  );
  const requisitions = read('src/content/own/PurchaseRequisitions/index.tsx');
  const history = read('src/content/own/ApprovalManagement/index.tsx');
  const service = fs.readFileSync(
    path.join(
      __dirname,
      '../../api/src/main/java/com/grash/service/ProcurementApprovalService.java'
    ),
    'utf8'
  );
  assert.match(
    progress,
    /state[.]summary[?][.]status === 'PENDING' && state[.]summary[.]stepBlocked/
  );
  assert.match(
    progress,
    /viewPermissions[?][.]includes\(PermissionEntity[.]SETTINGS\)[^]*?editOtherPermissions[?][.]includes\(PermissionEntity[.]SETTINGS\)/
  );
  assert.match(progress, /reassignment-targets/);
  assert.match(
    progress,
    /targetUserId: selectedTarget.id,[\s\S]*?reason: reason.trim\(\)/
  );
  assert.match(requisitions, /ap_manage_blocked/);
  assert.match(history, /'APPROVED', 'REJECTED', 'REASSIGNED'/);
  assert.match(
    service,
    /if \(hasEligibleApprover\(instance, steps\)\) throw conflict\("approval_step_not_blocked"\)/
  );
  assert.match(service, /event\.setAction\("REASSIGNED"\)/);
});

test('procurement read APIs enforce the subscription entitlement server-side', () => {
  const api = (file) =>
    fs.readFileSync(
      path.join(
        __dirname,
        '../../api/src/main/java/com/grash/controller',
        file
      ),
      'utf8'
    );
  const orders = api('PurchaseOrderController.java');
  const requisitions = api('PurchaseRequisitionController.java');
  const lines = api('PartQuantityController.java');
  const categories = api('PurchaseOrderCategoryController.java');
  const receipts = api('PurchaseOrderReceiptController.java');
  assert.match(orders, /search\([\s\S]*?requireModuleEnabled\(user\)/);
  assert.match(orders, /getById\([\s\S]*?requireModuleEnabled\(user\)/);
  assert.match(
    requisitions,
    /PurchaseRequisitionShowDTO get\([\s\S]*?requireModuleEnabled\(user\)/
  );
  assert.match(
    requisitions,
    /PurchaseRequisitionShowDTO> list\([\s\S]*?requireModuleEnabled\(user\)/
  );
  assert.match(
    lines,
    /getByPurchaseOrder\([\s\S]*?requireModuleEnabled\(user\)/
  );
  assert.match(
    lines,
    /getById\([\s\S]*?getPurchaseOrder\(\) != null\)[\s\S]*?requireModuleEnabled\(user\)/
  );
  assert.match(categories, /getAll\([\s\S]*?requireModuleEnabled\(user\)/);
  assert.match(categories, /getById\([\s\S]*?requireModuleEnabled\(user\)/);
  assert.match(
    receipts,
    /List<PurchaseOrderReceiptShowDTO> list\([\s\S]*?requireModuleEnabled\(user\)/
  );
});

test('approved requisition filter keeps fully ordered requests visible', () => {
  const requisitions = read('src/content/own/PurchaseRequisitions/index.tsx');
  assert.match(
    requisitions,
    /approved: \['APPROVED', 'PARTIALLY_ORDERED', 'ORDERED'\]/
  );
});

test('procurement mutations surface API errors instead of a generic failure', () => {
  const requisitions = read('src/content/own/PurchaseRequisitions/index.tsx');
  const orders = read('src/content/own/PurchaseOrders/index.tsx');
  assert.match(
    requisitions,
    /catch \(error\) \{\s*showSnackBar\(t\(getErrorMessage\(error, 'requisition_action_failed'\)\)/
  );
  assert.match(orders, /getErrorMessage\(err, 'po_edit_failure'\)/);
  assert.match(orders, /getErrorMessage\(err, 'po_delete_failure'\)/);
});

test('Sage 300 is visible in Settings without claiming a connector is active', () => {
  const connectors = read(
    'src/content/own/Settings/Integrations/Connectors.tsx'
  );
  const english = read('src/i18n/translations/en.ts');
  const french = read('src/i18n/translations/fr.ts');
  assert.match(connectors, /id: 'sage-300',[\s\S]*?available: false/);
  assert.match(
    english,
    /integration_sage300_description:[\s\S]*?not available yet/
  );
  assert.match(
    french,
    /integration_sage300_description:[\s\S]*?ne sont pas encore disponibles/
  );
  assert.match(connectors, /integration_sage300_prerequisites/);
  assert.match(connectors, /id === 'sage-300'[\s\S]*?rel="noopener noreferrer"/);
  assert.match(connectors, /https:\/\/github\.com\/SageNADev\/Sage300-SDK/);
  assert.match(english, /integration_sage300_prerequisites:[\s\S]*?secrets vault/);
  assert.match(french, /integration_sage300_prerequisites:[\s\S]*?coffre de secrets/);
  assert.match(english, /integration_sage300_docs:[\s\S]*?documentation/);
  assert.match(french, /integration_sage300_docs:[\s\S]*?documentation/);
});

test('PDFME designer remains limited to work orders while native templates include procurement', () => {
  const templates = read('src/content/own/Settings/Documents/DocumentTemplates.tsx');
  assert.match(templates, /'PURCHASE_ORDER', 'PURCHASE_REQUISITION'\]\s*\.includes\(type\.providerCode\)/);
  assert.match(templates, /item\.documentTypeCode === 'WORK_ORDER'/);
});

test('purchase order categories are available in Settings with category permissions', () => {
  const settings = read('src/content/own/Settings/SettingsLayout.tsx');
  const routes = read('src/router/app.tsx');
  const categoryPage = read(
    'src/content/own/Settings/PurchaseOrderCategories.tsx'
  );
  const english = read('src/i18n/translations/en.ts');
  const french = read('src/i18n/translations/fr.ts');
  assert.match(settings, /purchase-order-categories/);
  assert.match(settings, /canViewCategories/);
  assert.match(settings, /isCategoriesRoute\s*\?\s*canEditCategories/);
  assert.match(
    routes,
    /path: 'purchase-order-categories',[\s\S]*?PurchaseOrderCategoriesSettings/
  );
  assert.match(categoryPage, /<PurchaseOrderCategories settingsMode \/>/);
  assert.match(
    english,
    /purchase_order_categories: 'Purchase order categories'/
  );
  assert.match(
    french,
    /purchase_order_categories: 'Catégories de bons de commande'/
  );
});

test('low-memory production builds typecheck separately before bundling', () => {
  const overrides = read('config-overrides.js');
  const dockerfile = read('Dockerfile');
  const packageJson = JSON.parse(read('package.json'));
  assert.match(overrides, /QPM_LOW_MEMORY_BUILD === '1'/);
  assert.match(overrides, /ForkTsCheckerWebpackPlugin/);
  assert.equal(packageJson.scripts.typecheck, 'tsc --noEmit --pretty false');
  assert.match(
    dockerfile,
    /RUN npm run typecheck[\s\S]*?QPM_LOW_MEMORY_BUILD=1[\s\S]*?npm run build/
  );
});

test('PO estimates use the captured inventory cost and currency, not a later stock cost', () => {
  const lines = read('src/content/own/components/PartQuantitiesList.tsx');
  const orders = read('src/content/own/PurchaseOrders/index.tsx');
  const approval = fs.readFileSync(
    path.join(
      __dirname,
      '../../api/src/main/java/com/grash/service/ProcurementApprovalService.java'
    ),
    'utf8'
  );
  assert.match(lines, /line\.purchaseUnitCostSnapshot/);
  assert.match(lines, /!line\.purchaseCurrencySnapshot/);
  assert.doesNotMatch(lines, /purchaseCurrencySnapshot\s*\|\|\s*'XOF'/);
  assert.match(orders, /line\.purchaseUnitCostSnapshot/);
  assert.match(orders, /purchaseCurrencySnapshot/);
  assert.match(orders, /unitCostSnapshot.*costCurrencySnapshot/);
  assert.match(approval, /line\.getPurchaseUnitCostSnapshot\(\) == null/);
});

test('PO totals safely handle empty lines and distinguish supplier price from inventory estimate', () => {
  const lines = read('src/content/own/components/PartQuantitiesList.tsx');
  const details = read(
    'src/content/own/PurchaseOrders/PurchaseOrderDetails.tsx'
  );
  const api = fs.readFileSync(
    path.join(
      __dirname,
      '../../api/src/main/java/com/grash/model/PartQuantity.java'
    ),
    'utf8'
  );
  assert.match(
    lines,
    /partQuantities\.length === 0 \|\| partQuantities\.some\(\(line\) => line\.purchaseUnitPrice/
  );
  assert.match(
    lines,
    /partQuantities\.length === 0 \|\| partQuantities\.some\(\(line\) => line\.purchaseUnitCostSnapshot/
  );
  assert.match(lines, /line\.purchaseUnitPrice/);
  assert.match(lines, /line\.purchaseUnitCostSnapshot/);
  assert.match(
    details,
    /approvalState\.ready && !approvalState\.summary && purchaseOrder\.status !== 'APPROVED'/
  );
  assert.match(
    details,
    /!approvalState\.ready \|\| Boolean\(approvalState\.summary\)/
  );
  assert.match(api, /purchaseOrder != null && purchaseUnitPrice != null/);
});

test('PO creation and PR conversion require an explicit supplier unit price', () => {
  const create = read('src/content/own/PurchaseOrders/Create.tsx');
  const requisitions = read('src/content/own/PurchaseRequisitions/index.tsx');
  const dto = fs.readFileSync(
    path.join(
      __dirname,
      '../../api/src/main/java/com/grash/dto/PurchaseRequisitionConversionRequest.java'
    ),
    'utf8'
  );
  assert.match(create, /purchaseUnitPriceInput: true/);
  assert.match(create, /partQuantity\.purchaseUnitPrice == null/);
  assert.match(requisitions, /purchaseUnitPrice: unitPrices\[line\.id\]/);
  assert.match(dto, /@NotNull[\s\S]*?private BigDecimal purchaseUnitPrice/);
});

test('PO receipt errors map backend validation keys to localized messages', () => {
  const details = read('src/content/own/PurchaseOrders/PurchaseOrderDetails.tsx');
  assert.match(details, /showSnackBar\(t\(getErrorMessage\(error\)\), 'error'\)/);
  const translations = fs.readFileSync(
    path.join(__dirname, '../src/i18n/translations/approvalManagement.ts'),
    'utf8'
  );
  assert.match(translations, /procurement_inventory_quantity_overflow:/);
  assert.match(translations, /purchase_order_receipt_totals_invalid:/);
});
