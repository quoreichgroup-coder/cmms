package com.grash.service;

import com.grash.dto.ReportConfig;
import com.grash.dto.ReportFieldDefinitionDTO;
import com.grash.factory.StorageServiceFactory;
import com.grash.model.Company;
import com.grash.model.DocumentTemplate;
import com.grash.model.DocumentTemplateVersion;
import com.grash.model.DocumentType;
import com.grash.model.GeneratedDocument;
import com.grash.model.Role;
import com.grash.model.User;
import com.grash.model.WorkOrder;
import com.grash.model.Request;
import com.grash.model.PurchaseOrder;
import com.grash.model.PurchaseRequisition;
import com.grash.repository.PurchaseRequisitionRepository;
import com.grash.repository.PartQuantityRepository;
import com.grash.model.enums.PermissionEntity;
import com.grash.model.enums.Status;
import com.grash.model.enums.DocumentTemplateStatus;
import com.grash.repository.GeneratedDocumentRepository;
import com.grash.repository.GeneratedDocumentAccessEventRepository;
import com.grash.repository.DocumentTemplateRepository;
import com.grash.repository.PurchaseOrderRepository;
import org.springframework.context.MessageSource;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GeneratedDocumentServiceTest {
    @InjectMocks private GeneratedDocumentService service;
    @Mock private GeneratedDocumentRepository repository;
    @Mock private GeneratedDocumentAccessEventRepository accessEventRepository;
    @Mock private WorkOrderService workOrderService;
    @Mock private StorageServiceFactory storageFactory;
    @Mock private DocumentContextResolver documentContextResolver;
    @Mock private WorkOrderReportDataProvider workOrderReportDataProvider;
    @Mock private RequestReportDataProvider requestReportDataProvider;
    @Mock private RequestService requestService;
    @Mock private StorageService storage;
    @Mock private DocumentTemplateRepository templateRepository;
    @Mock private PurchaseOrderRepository purchaseOrderRepository;
    @Mock private PartQuantityRepository partQuantityRepository;
    @Mock private ProcurementSiteService procurementSiteService;
    @Mock private PurchaseRequisitionRepository purchaseRequisitionRepository;
    @Mock private PurchaseOrderPolicyService purchaseOrderPolicyService;
    @Mock private ReportTemplateConfigurationValidator templateValidator;
    @Mock private PdfmeTemplateConfigurationValidator pdfmeValidator;
    @Mock private PdfmeRendererClient pdfmeRendererClient;
    @Mock private DocumentDataProviderRegistry providerRegistry;
    @Mock private ConfigurableWorkOrderReportRenderer templateRenderer;
    @Mock private MessageSource messageSource;

    @Test
    @SuppressWarnings("unchecked")
    void everyFieldAProcurementProviderAcceptsCanBeRendered() {
        // A template may show any field the provider accepts; if the renderer does not know it, preview and
        // issue fail with "Unsupported report field" (seen in production with the company header fields).
        List<com.grash.dto.ReportFieldDefinitionDTO> rendererFields =
                (List<com.grash.dto.ReportFieldDefinitionDTO>) org.springframework.test.util.ReflectionTestUtils
                        .getField(GeneratedDocumentService.class, "PROCUREMENT_FIELDS");
        java.util.Set<String> renderable = rendererFields.stream()
                .map(com.grash.dto.ReportFieldDefinitionDTO::key).collect(java.util.stream.Collectors.toSet());
        for (Class<?> provider : List.of(PurchaseOrderDocumentDataProvider.class,
                PurchaseRequisitionDocumentDataProvider.class)) {
            java.util.Set<String> accepted = (java.util.Set<String>) org.springframework.test.util.ReflectionTestUtils
                    .getField(provider, "FIELDS");
            java.util.Set<String> missing = new java.util.TreeSet<>(accepted);
            missing.removeAll(renderable);
            assertEquals(java.util.Set.of(), missing, provider.getSimpleName() + " fields unknown to the renderer");
        }
    }

    @Test
    void procurementPrintTablesHaveAHeaderForEveryAllowedColumn() {
        var poTable = org.springframework.test.util.ReflectionTestUtils.invokeMethod(service, "reportTable",
                "purchaseOrder.lines", java.util.Map.of("purchaseOrder.lines", List.of()), java.util.Locale.FRENCH,
                "UTC", null);
        var prTable = org.springframework.test.util.ReflectionTestUtils.invokeMethod(service, "reportTable",
                "purchaseRequisition.lines", java.util.Map.of("purchaseRequisition.lines", List.of()), java.util.Locale.FRENCH,
                "UTC", null);

        assertNotNull(poTable);
        assertNotNull(prTable);
        assertEquals(8, ((ConfigurableWorkOrderReportRenderer.ReportTable) poTable).headers().size());
        assertEquals(6, ((ConfigurableWorkOrderReportRenderer.ReportTable) prTable).headers().size());
        assertEquals("Site", ((ConfigurableWorkOrderReportRenderer.ReportTable) poTable).headers().get(7));
        assertEquals("Site", ((ConfigurableWorkOrderReportRenderer.ReportTable) prTable).headers().get(5));
    }

    @Test
    void purchaseOrderCannotBeOfficiallyIssuedBeforeApproval() {
        Company company = new Company(); company.setId(7L);
        Role role = Role.builder().viewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.PURCHASE_ORDERS)))
                .viewOtherPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.PURCHASE_ORDERS)))
                .editOtherPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.PURCHASE_ORDERS))).build();
        User user = new User(); user.setId(11L); user.setCompany(company); user.setRole(role);
        PurchaseOrder order = new PurchaseOrder(); order.setId(42L); order.setCompany(company); order.setCreatedBy(11L);
        when(purchaseOrderRepository.findByIdForUpdateAndCompany(42L, 7L)).thenReturn(Optional.of(order));
        when(partQuantityRepository.findByPurchaseOrder_Id(42L)).thenReturn(List.of());

        var error = assertThrows(com.grash.exception.CustomException.class,
                () -> service.issuePurchaseOrder(42L, 3L, user));
        assertEquals(org.springframework.http.HttpStatus.CONFLICT, error.getHttpStatus());
        verifyNoInteractions(templateRepository, storageFactory);
    }

    @Test
    void visiblePurchaseRequisitionCannotBeOfficiallyIssuedWithoutEditPermission() {
        Company company = new Company(); company.setId(7L);
        Role role = Role.builder().viewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.PURCHASE_REQUISITIONS)))
                .viewOtherPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.PURCHASE_REQUISITIONS)))
                .editOtherPermissions(new HashSet<>()).build();
        User viewer = new User(); viewer.setId(11L); viewer.setCompany(company); viewer.setRole(role);
        User requester = new User(); requester.setId(12L);
        PurchaseRequisition requisition = new PurchaseRequisition(); requisition.setCompany(company);
        requisition.setRequester(requester);
        when(purchaseRequisitionRepository.findWithLinesByIdAndCompany(42L, 7L)).thenReturn(Optional.of(requisition));

        var error = assertThrows(com.grash.exception.CustomException.class,
                () -> service.issuePurchaseRequisition(42L, 3L, viewer));
        assertEquals(org.springframework.http.HttpStatus.FORBIDDEN, error.getHttpStatus());
        verifyNoInteractions(templateRepository, storageFactory);
    }

    @Test
    void procurementDocumentTemplatesRequireAnEnabledProcurementModule() {
        User user = new User();
        doThrow(new com.grash.exception.CustomException("module_disabled", org.springframework.http.HttpStatus.FORBIDDEN))
                .when(purchaseOrderPolicyService).requireModuleEnabled(user);

        var error = assertThrows(com.grash.exception.CustomException.class,
                () -> service.listPublishedPurchaseOrderTemplates(42L, user));

        assertEquals(org.springframework.http.HttpStatus.FORBIDDEN, error.getHttpStatus());
        verifyNoInteractions(purchaseOrderRepository, templateRepository);
    }

    @Test
    void approvedPurchaseOrderIssuesAStoredVersionedPdf() throws Exception {
        Company company = new Company(); company.setId(7L);
        company.getCompanySettings().getGeneralPreferences().setColor("#2F5BEA");
        Role role = Role.builder().viewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.PURCHASE_ORDERS)))
                .viewOtherPermissions(new HashSet<>()).editOtherPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.PURCHASE_ORDERS))).build();
        User user = new User(); user.setId(11L); user.setCompany(company); user.setRole(role);
        PurchaseOrder order = new PurchaseOrder(); order.setId(42L); order.setCompany(company); order.setCreatedBy(11L);
        order.setStatus(com.grash.model.enums.ApprovalStatus.APPROVED);
        var configuration = new com.fasterxml.jackson.databind.ObjectMapper().readTree("""
                {"schemaVersion":"1.0","documentType":"PURCHASE_ORDER","provider":"PURCHASE_ORDER",
                 "style":"CLASSIC","page":{"size":"A4","orientation":"PORTRAIT","marginMm":10},
                 "visibleFields":["purchaseOrder.number","purchaseOrder.status","purchaseOrder.lines"],
                 "options":{"showPageNumbers":true,"repeatTableHeader":true}}
                """);
        DocumentType type = new DocumentType(); type.setCode("PURCHASE_ORDER"); type.setProviderCode("PURCHASE_ORDER");
        DocumentTemplateVersion version = new DocumentTemplateVersion();
        version.setId(19L); version.setVersionNumber(3); version.setStatus(DocumentTemplateStatus.PUBLISHED); version.setConfiguration(configuration);
        DocumentTemplate template = new DocumentTemplate(); template.setId(9L); template.setDocumentType(type);
        template.setStatus(DocumentTemplateStatus.PUBLISHED); template.setPublishedVersion(version);
        var context = new DocumentContextResolver.DocumentContext("QPM", "QPM SA", null, null, "Abidjan",
                "RC-1", "NIF-1", "XOF", com.grash.model.enums.DateFormat.DDMMYY, "UTC",
                com.grash.model.enums.Language.FR, java.util.Locale.FRENCH, null, null);
        when(purchaseOrderRepository.findByIdForUpdateAndCompany(42L, 7L)).thenReturn(Optional.of(order));
        when(partQuantityRepository.findByPurchaseOrder_Id(42L)).thenReturn(List.of());
        when(templateRepository.findByIdAndCompany_IdAndStatus(9L, 7L, DocumentTemplateStatus.PUBLISHED))
                .thenReturn(Optional.of(template));
        when(templateValidator.validate(configuration, "PURCHASE_ORDER", "PURCHASE_ORDER")).thenReturn(configuration);
        when(templateValidator.visibleFields(configuration)).thenReturn(List.of("purchaseOrder.number", "purchaseOrder.status", "purchaseOrder.lines"));
        DocumentDataProvider provider = mock(DocumentDataProvider.class);
        when(providerRegistry.require("PURCHASE_ORDER")).thenReturn(provider);
        when(provider.resolve(eq(order), eq(context), anySet())).thenReturn(java.util.Map.of(
                "purchaseOrder.number", "PO-42", "purchaseOrder.status", "Approuvé", "purchaseOrder.lines", List.of()));
        when(documentContextResolver.resolve(company, null)).thenReturn(context);
        when(messageSource.getMessage("report.field.purchaseOrder.number", null, "purchaseOrder.number", java.util.Locale.FRENCH))
                .thenReturn("Numéro du bon de commande");
        when(messageSource.getMessage("report.field.purchaseOrder.status", null, "purchaseOrder.status", java.util.Locale.FRENCH))
                .thenReturn("Statut d’approbation");
        when(templateRenderer.render(eq(configuration), anyList(), eq(context), isNull(), anyString()))
                .thenReturn(new byte[]{'%', 'P', 'D', 'F'});
        when(storageFactory.getStorageService()).thenReturn(storage);
        when(storage.upload(any(byte[].class), anyString(), anyString())).thenReturn("issued/po-42.pdf");
        when(repository.save(any(GeneratedDocument.class))).thenAnswer(invocation -> {
            GeneratedDocument document = invocation.getArgument(0); document.setId(55L); return document;
        });

        var issued = service.issuePurchaseOrder(42L, 9L, user);

        assertEquals("PURCHASE_ORDER", issued.getSourceType());
        assertEquals("PURCHASE_ORDER_FORM", issued.getDocumentType());
        assertEquals(42L, issued.getSourceId());
        assertEquals(19L, issued.getTemplateVersionId());
        verify(storage).upload(any(byte[].class), contains("PurchaseOrder-42-"), eq("issued-documents/7/purchase-orders"));
        verify(templateRenderer).render(eq(configuration), org.mockito.ArgumentMatchers.<List<ConfigurableWorkOrderReportRenderer.ReportBlock>>argThat(blocks -> blocks.size() == 2
                && blocks.stream().anyMatch(block -> block.row() != null && "PO-42".equals(block.row().value()))
                && blocks.stream().noneMatch(block -> block.table() != null)),
                eq(context), isNull(), anyString());
    }

    @Test
    void issuingWorkOrderReportStoresImmutableArtifactMetadata() {
        Company company = new Company(); company.setId(7L);
        company.getCompanySettings().getGeneralPreferences().setColor("#2F5BEA");
        Role role = Role.builder().viewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.WORK_ORDERS)))
                .viewOtherPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.WORK_ORDERS)))
                .editOtherPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.WORK_ORDERS))).build();
        User user = new User(); user.setId(11L); user.setCompany(company); user.setRole(role);
        WorkOrder order = new WorkOrder(); order.setId(42L); order.setCompany(company); order.setCreatedBy(11L);
        when(documentContextResolver.resolve(order)).thenReturn(new DocumentContextResolver.DocumentContext(
                "Company", null, null, null, null, null, null, "", null, "UTC",
                com.grash.model.enums.Language.EN, java.util.Locale.ENGLISH, null, null));
        when(workOrderService.findById(42L)).thenReturn(Optional.of(order));
        when(workOrderService.generatePdfBytes(eq(order), eq(user), any(ReportConfig.class)))
                .thenReturn(new byte[]{1, 2, 3});
        when(storageFactory.getStorageService()).thenReturn(storage);
        when(storage.upload(any(byte[].class), anyString(), anyString())).thenReturn("issued-documents/7/work-orders/42.pdf");
        when(repository.save(any(GeneratedDocument.class))).thenAnswer(invocation -> {
            GeneratedDocument doc = invocation.getArgument(0);
            doc.setId(5L);
            return doc;
        });

        var result = service.issueWorkOrderReport(42L, new ReportConfig(), user);

        assertEquals(5L, result.getId());
        assertEquals("WORK_ORDER_REPORT", result.getDocumentType());
        assertEquals("WORK_ORDER", result.getSourceType());
        assertEquals(42L, result.getSourceId());
        assertEquals("work-order-report-v1", result.getTemplateVersion());
        var savedDocument = org.mockito.ArgumentCaptor.forClass(GeneratedDocument.class);
        verify(repository).save(savedDocument.capture());
        assertTrue(savedDocument.getValue().getRenderSnapshot().contains("Company"));
        assertTrue(savedDocument.getValue().getRenderSnapshot().contains("reportConfig"));
        assertEquals(64, result.getSha256().length());
    }

    @Test
    void requestReportPreviewRequiresCompanyAndExistingRequestVisibility() {
        Company company = new Company(); company.setId(7L);
        Role role = Role.builder().viewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.REQUESTS)))
                .viewOtherPermissions(new HashSet<>()).build();
        User user = new User(); user.setId(11L); user.setCompany(company); user.setRole(role);
        Request request = new Request(); request.setId(55L); request.setCompany(company); request.setCreatedBy(21L);
        when(requestService.findById(55L)).thenReturn(Optional.of(request));

        assertThrows(com.grash.exception.CustomException.class,
                () -> service.previewRequestReportData(55L, java.util.List.of("request.title"), user));
        verifyNoInteractions(documentContextResolver, requestReportDataProvider);
    }

    @Test
    void requestReportPreviewDoesNotRevealCrossCompanyRequest() {
        Company userCompany = new Company(); userCompany.setId(7L);
        Company otherCompany = new Company(); otherCompany.setId(8L);
        Role role = Role.builder().viewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.REQUESTS)))
                .viewOtherPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.REQUESTS))).build();
        User user = new User(); user.setId(11L); user.setCompany(userCompany); user.setRole(role);
        Request request = new Request(); request.setId(55L); request.setCompany(otherCompany);
        when(requestService.findById(55L)).thenReturn(Optional.of(request));

        var exception = assertThrows(com.grash.exception.CustomException.class,
                () -> service.previewRequestReportData(55L, java.util.List.of("request.title"), user));

        assertEquals(org.springframework.http.HttpStatus.NOT_FOUND, exception.getHttpStatus());
        verifyNoInteractions(documentContextResolver, requestReportDataProvider);
    }

    @Test
    void requestTemplatePreviewRequiresCurrentRequestVisibilityBeforeResolvingTemplate() {
        Company company = new Company(); company.setId(7L);
        Role role = Role.builder().viewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.REQUESTS)))
                .viewOtherPermissions(new HashSet<>()).build();
        User user = new User(); user.setId(12L); user.setCompany(company); user.setRole(role);
        Request request = new Request(); request.setId(55L); request.setCompany(company); request.setCreatedBy(11L);
        when(requestService.findById(55L)).thenReturn(Optional.of(request));

        var exception = assertThrows(com.grash.exception.CustomException.class,
                () -> service.previewRequestReportFromTemplate(55L, 9L, user));

        assertEquals(org.springframework.http.HttpStatus.FORBIDDEN, exception.getHttpStatus());
        verifyNoInteractions(templateRepository, templateValidator, providerRegistry,
                documentContextResolver, templateRenderer, storageFactory);
    }

    @Test
    void requestTemplateListRequiresCurrentRequestVisibility() {
        Company company = new Company(); company.setId(7L);
        Role role = Role.builder().viewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.REQUESTS)))
                .viewOtherPermissions(new HashSet<>()).build();
        User user = new User(); user.setId(12L); user.setCompany(company); user.setRole(role);
        Request request = new Request(); request.setId(55L); request.setCompany(company); request.setCreatedBy(11L);
        when(requestService.findById(55L)).thenReturn(Optional.of(request));

        var exception = assertThrows(com.grash.exception.CustomException.class,
                () -> service.listPublishedRequestReportTemplates(55L, user));

        assertEquals(org.springframework.http.HttpStatus.FORBIDDEN, exception.getHttpStatus());
        verifyNoInteractions(templateRepository);
    }

    @Test
    void requestReportPreviewReturnsOnlyRequestedFieldsForAuthorizedCreator() {
        Company company = new Company(); company.setId(7L);
        Role role = Role.builder().viewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.REQUESTS)))
                .viewOtherPermissions(new HashSet<>()).build();
        User user = new User(); user.setId(11L); user.setCompany(company); user.setRole(role);
        Request request = new Request(); request.setId(55L); request.setCompany(company); request.setCreatedBy(11L);
        var context = new DocumentContextResolver.DocumentContext("QPM", null, null, null, null, null, null,
                "", null, "UTC", com.grash.model.enums.Language.EN, java.util.Locale.ENGLISH, null, null);
        when(requestService.findById(55L)).thenReturn(Optional.of(request));
        when(documentContextResolver.resolve(request)).thenReturn(context);
        when(requestReportDataProvider.resolve(eq(request), eq(context), eq(java.util.Set.of("request.title"))))
                .thenReturn(java.util.Map.of("request.title", "Inspect pump"));

        var result = service.previewRequestReportData(55L, java.util.List.of("request.title"), user);

        assertEquals(java.util.Map.of("request.title", "Inspect pump"), result);
        verify(requestReportDataProvider).resolve(eq(request), eq(context), eq(java.util.Set.of("request.title")));
    }

    @Test
    void authorizedCreatorCanIssueReportForCompletedWorkOrder() {
        Company company = new Company(); company.setId(7L);
        Role role = Role.builder().viewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.WORK_ORDERS)))
                .viewOtherPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.WORK_ORDERS))).build();
        User user = new User(); user.setId(11L); user.setCompany(company); user.setRole(role);
        WorkOrder order = new WorkOrder(); order.setId(42L); order.setCompany(company);
        order.setCreatedBy(11L); order.setStatus(Status.COMPLETE);
        when(workOrderService.findById(42L)).thenReturn(Optional.of(order));
        when(workOrderService.generatePdfBytes(eq(order), eq(user), any(ReportConfig.class)))
                .thenReturn(new byte[]{1, 2, 3});
        when(documentContextResolver.resolve(order)).thenReturn(new DocumentContextResolver.DocumentContext(
                "Company", null, null, null, null, null, null, "", null, "UTC",
                com.grash.model.enums.Language.EN, java.util.Locale.ENGLISH, null, null));
        when(storageFactory.getStorageService()).thenReturn(storage);
        when(storage.upload(any(byte[].class), anyString(), anyString()))
                .thenReturn("issued-documents/7/work-orders/42.pdf");
        when(repository.save(any(GeneratedDocument.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.issueWorkOrderReport(42L, new ReportConfig(), user);

        verify(workOrderService).generatePdfBytes(eq(order), eq(user), any(ReportConfig.class));
        verify(repository).save(any(GeneratedDocument.class));
        assertFalse(order.canBeEditedBy(user), "issuing a report must not make the completed WO editable");
    }

    @Test
    void readOnlyUserCannotIssueWorkOrderReport() {
        Company company = new Company(); company.setId(7L);
        Role role = Role.builder().viewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.WORK_ORDERS)))
                .viewOtherPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.WORK_ORDERS))).build();
        User user = new User(); user.setId(12L); user.setCompany(company); user.setRole(role);
        WorkOrder order = new WorkOrder(); order.setId(42L); order.setCompany(company); order.setCreatedBy(11L);
        when(workOrderService.findById(42L)).thenReturn(Optional.of(order));

        var exception = assertThrows(com.grash.exception.CustomException.class,
                () -> service.issueWorkOrderReport(42L, new ReportConfig(), user));

        assertEquals(org.springframework.http.HttpStatus.FORBIDDEN, exception.getHttpStatus());
        verify(workOrderService, never()).generatePdfBytes(any(), any(), any());
        verifyNoInteractions(storageFactory, documentContextResolver, repository);
    }

    @Test
    void templatePreviewRequiresSettingsPermissionBeforeLookingUpTemplate() {
        Company company = new Company(); company.setId(7L);
        Role role = Role.builder().viewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.WORK_ORDERS))).build();
        User user = new User(); user.setId(12L); user.setCompany(company); user.setRole(role);

        var exception = assertThrows(com.grash.exception.CustomException.class,
                () -> service.previewDocumentTemplate(9L, 42L, user));

        assertEquals(org.springframework.http.HttpStatus.FORBIDDEN, exception.getHttpStatus());
        verifyNoInteractions(templateRepository, workOrderService, templateValidator, providerRegistry,
                templateRenderer, documentContextResolver);
    }

    @Test
    void cannotIssueReportForWorkOrderFromAnotherCompany() {
        Company requesterCompany = new Company(); requesterCompany.setId(7L);
        Company workOrderCompany = new Company(); workOrderCompany.setId(8L);
        Role role = Role.builder().viewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.WORK_ORDERS)))
                .viewOtherPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.WORK_ORDERS)))
                .editOtherPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.WORK_ORDERS))).build();
        User user = new User(); user.setId(11L); user.setCompany(requesterCompany); user.setRole(role);
        WorkOrder order = new WorkOrder(); order.setId(42L); order.setCompany(workOrderCompany);
        when(workOrderService.findById(42L)).thenReturn(Optional.of(order));

        var exception = assertThrows(com.grash.exception.CustomException.class,
                () -> service.issueWorkOrderReport(42L, new ReportConfig(), user));

        assertEquals(org.springframework.http.HttpStatus.NOT_FOUND, exception.getHttpStatus());
        verify(workOrderService, never()).generatePdfBytes(any(), any(), any());
        verifyNoInteractions(storageFactory, documentContextResolver, repository);
    }

    @Test
    void templateReportIssuanceCannotResolveTemplateOutsideCompanyOrBeforePublication() {
        Company company = new Company(); company.setId(7L);
        Role role = Role.builder().viewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.WORK_ORDERS)))
                .viewOtherPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.WORK_ORDERS)))
                .editOtherPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.WORK_ORDERS))).build();
        User user = new User(); user.setId(11L); user.setCompany(company); user.setRole(role);
        WorkOrder order = new WorkOrder(); order.setId(42L); order.setCompany(company); order.setCreatedBy(11L);
        when(workOrderService.findById(42L)).thenReturn(Optional.of(order));
        when(templateRepository.findByIdAndCompany_IdAndStatus(9L, 7L, DocumentTemplateStatus.PUBLISHED))
                .thenReturn(Optional.empty());

        var exception = assertThrows(com.grash.exception.CustomException.class,
                () -> service.issueWorkOrderReportFromTemplate(42L, 9L, user));

        assertEquals(org.springframework.http.HttpStatus.NOT_FOUND, exception.getHttpStatus());
        verify(templateRepository).findByIdAndCompany_IdAndStatus(9L, 7L, DocumentTemplateStatus.PUBLISHED);
        verifyNoInteractions(templateValidator, providerRegistry, templateRenderer, storageFactory, repository);
    }

    @Test
    void templateReportIssuanceStoresTheExactPublishedVersionAndRenderedValues() throws Exception {
        Company company = new Company(); company.setId(7L);
        company.getCompanySettings().getGeneralPreferences().setColor("#2F5BEA");
        Role role = Role.builder().viewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.WORK_ORDERS)))
                .viewOtherPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.WORK_ORDERS)))
                .editOtherPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.WORK_ORDERS))).build();
        User user = new User(); user.setId(11L); user.setCompany(company); user.setRole(role);
        WorkOrder order = new WorkOrder(); order.setId(42L); order.setCompany(company); order.setCreatedBy(11L);
        var configuration = new com.fasterxml.jackson.databind.ObjectMapper().readTree("""
                {"schemaVersion":"2.0","documentType":"WORK_ORDER","provider":"WORK_ORDER",
                 "style":"MODERN","page":{"size":"A4","orientation":"LANDSCAPE","marginMm":10},
                 "layout":[{"id":"summary","type":"SECTION","title":"Summary","columns":1,
                   "items":[{"id":"title","type":"FIELD","fieldKey":"workOrder.title","label":"Inspection summary"},
                            {"id":"operations","type":"TABLE","fieldKey":"workOrder.executionTasks",
                             "tableColumns":["notes","task"],"columnWidths":[35,65]}]}],
                 "options":{"showPageNumbers":true,"repeatTableHeader":true}}
                """);
        DocumentType type = new DocumentType(); type.setCode("WORK_ORDER"); type.setProviderCode("WORK_ORDER");
        DocumentTemplateVersion version = new DocumentTemplateVersion();
        version.setId(19L); version.setVersionNumber(3); version.setStatus(DocumentTemplateStatus.PUBLISHED);
        version.setConfiguration(configuration);
        DocumentTemplate template = new DocumentTemplate();
        template.setId(9L); template.setDocumentType(type); template.setPublishedVersion(version);
        var context = new DocumentContextResolver.DocumentContext("Company", "Legal SARL", null, null, null,
                "RC-1", "NIF-1", "XOF", null, "UTC", com.grash.model.enums.Language.EN,
                java.util.Locale.ENGLISH, null, null);
        when(workOrderService.findById(42L)).thenReturn(Optional.of(order));
        when(templateRepository.findByIdAndCompany_IdAndStatus(9L, 7L, DocumentTemplateStatus.PUBLISHED))
                .thenReturn(Optional.of(template));
        when(templateValidator.validate(configuration, "WORK_ORDER", "WORK_ORDER")).thenReturn(configuration);
        when(templateValidator.visibleFields(configuration)).thenReturn(
                List.of("workOrder.title", "workOrder.executionTasks"));
        DocumentDataProvider provider = mock(DocumentDataProvider.class);
        when(providerRegistry.require("WORK_ORDER")).thenReturn(provider);
        when(provider.resolve(eq(order), eq(context), anySet())).thenReturn(java.util.Map.of(
                "workOrder.title", "Pump inspection",
                "workOrder.executionTasks", List.of(java.util.Map.of("step", "01", "task", "Inspect bearing",
                        "result", "PASS", "notes", "Within limits"))));
        when(documentContextResolver.resolve(order)).thenReturn(context);
        when(messageSource.getMessage("report.field.workOrder.title", null, "workOrder.title", java.util.Locale.ENGLISH))
                .thenReturn("Work Order");
        when(templateValidator.fieldLabel(configuration, "workOrder.title", "Work Order"))
                .thenReturn("Inspection summary");
        when(templateRenderer.render(eq(configuration), anyList(), eq(context), isNull(), anyString()))
                .thenReturn(new byte[]{1, 2, 3});
        when(storageFactory.getStorageService()).thenReturn(storage);
        when(storage.upload(any(byte[].class), anyString(), anyString())).thenReturn("issued/42.pdf");
        when(repository.save(any(GeneratedDocument.class))).thenAnswer(invocation -> {
            GeneratedDocument document = invocation.getArgument(0);
            document.setId(55L);
            return document;
        });

        var issued = service.issueWorkOrderReportFromTemplate(42L, 9L, user);

        assertEquals(19L, issued.getTemplateVersionId());
        assertEquals("template-9-v3", issued.getTemplateVersion());
        var saved = org.mockito.ArgumentCaptor.forClass(GeneratedDocument.class);
        verify(repository).save(saved.capture());
        assertSame(version, saved.getValue().getTemplateVersionEntity());
        assertTrue(saved.getValue().getRenderSnapshot().contains("Pump inspection"));
        verify(templateRenderer).render(eq(configuration), argThat(blocks -> blocks.size() == 2
                && blocks.get(0).type().equals("FIELD")
                && blocks.get(0).row().label().equals("Inspection summary")
                && blocks.get(0).row().value().equals("Pump inspection")
                && blocks.get(1).type().equals("TABLE")
                && blocks.get(1).table().headers().equals(List.of("Notes", "Operation / task"))
                && blocks.get(1).table().rows().equals(List.of(List.of("Within limits", "Inspect bearing")))
                && blocks.get(1).table().columnWidths().equals(List.of(35, 65))),
                eq(context), isNull(), anyString());
    }

    @Test
    void requestTemplateReportIssuesArchivedPdfWithoutChangingRequestWorkflow() throws Exception {
        Company company = new Company(); company.setId(7L);
        company.getCompanySettings().getGeneralPreferences().setColor("#2F5BEA");
        Role role = Role.builder().viewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.REQUESTS)))
                .viewOtherPermissions(new HashSet<>()).editOtherPermissions(new HashSet<>()).build();
        User user = new User(); user.setId(11L); user.setCompany(company); user.setRole(role);
        Request request = new Request(); request.setId(55L); request.setCompany(company);
        request.setCreatedBy(11L); request.setTitle("Check pump vibration");
        var configuration = new com.fasterxml.jackson.databind.ObjectMapper().readTree("""
                {"documentType":"REQUEST","provider":"REQUEST","visibleFields":["request.title"]}
                """);
        DocumentType type = new DocumentType(); type.setCode("REQUEST"); type.setProviderCode("REQUEST");
        DocumentTemplateVersion version = new DocumentTemplateVersion();
        version.setId(20L); version.setVersionNumber(2); version.setStatus(DocumentTemplateStatus.PUBLISHED);
        version.setConfiguration(configuration);
        DocumentTemplate template = new DocumentTemplate(); template.setId(9L); template.setDocumentType(type);
        template.setPublishedVersion(version); template.setStatus(DocumentTemplateStatus.PUBLISHED);
        var context = new DocumentContextResolver.DocumentContext("QPM", "QPM Industries SA", null, null,
                null, "RC-1", "NIF-1", "XOF", null, "UTC", com.grash.model.enums.Language.EN,
                java.util.Locale.ENGLISH, null, null);
        when(requestService.findById(55L)).thenReturn(Optional.of(request));
        when(templateRepository.findByIdAndCompany_IdAndStatus(9L, 7L, DocumentTemplateStatus.PUBLISHED))
                .thenReturn(Optional.of(template));
        when(templateValidator.validate(configuration, "REQUEST", "REQUEST")).thenReturn(configuration);
        when(templateValidator.visibleFields(configuration)).thenReturn(List.of("request.title"));
        DocumentDataProvider provider = mock(DocumentDataProvider.class);
        when(providerRegistry.require("REQUEST")).thenReturn(provider);
        when(provider.resolve(eq(request), eq(context), anySet()))
                .thenReturn(java.util.Map.of("request.title", "Check pump vibration"));
        when(documentContextResolver.resolve(request)).thenReturn(context);
        when(messageSource.getMessage("report.field.request.title", null, "request.title", java.util.Locale.ENGLISH))
                .thenReturn("Request title");
        when(templateRenderer.render(eq(configuration), anyList(), eq(context), isNull(), anyString()))
                .thenReturn(new byte[]{'%', 'P', 'D', 'F'});
        when(storageFactory.getStorageService()).thenReturn(storage);
        when(storage.upload(any(byte[].class), anyString(), anyString())).thenReturn("issued/request-55.pdf");
        when(repository.save(any(GeneratedDocument.class))).thenAnswer(invocation -> {
            GeneratedDocument document = invocation.getArgument(0); document.setId(57L); return document;
        });

        var issued = service.issueRequestReportFromTemplate(55L, 9L, user);

        assertEquals("REQUEST", issued.getSourceType());
        assertEquals("MAINTENANCE_REQUEST_REPORT", issued.getDocumentType());
        assertEquals(55L, issued.getSourceId());
        assertEquals(20L, issued.getTemplateVersionId());
        verify(storage).upload(any(byte[].class), contains("Request-55-"),
                eq("issued-documents/7/requests"));
        assertFalse(request.isCancelled());
        assertNull(request.getWorkOrder(), "document issuance must not approve/convert the request");
    }

    @Test
    void requestReportIssuanceRequiresExistingEditPermission() {
        Company company = new Company(); company.setId(7L);
        Role role = Role.builder().viewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.REQUESTS)))
                .viewOtherPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.REQUESTS)))
                .editOtherPermissions(new HashSet<>()).build();
        User user = new User(); user.setId(12L); user.setCompany(company); user.setRole(role);
        Request request = new Request(); request.setId(55L); request.setCompany(company); request.setCreatedBy(11L);
        when(requestService.findById(55L)).thenReturn(Optional.of(request));

        var exception = assertThrows(com.grash.exception.CustomException.class,
                () -> service.issueRequestReportFromTemplate(55L, 9L, user));

        assertEquals(org.springframework.http.HttpStatus.FORBIDDEN, exception.getHttpStatus());
        verifyNoInteractions(templateRepository, templateValidator, providerRegistry, templateRenderer,
                storageFactory, repository);
    }

    @Test
    void requestReportDownloadRechecksCurrentRequestVisibility() {
        Company company = new Company(); company.setId(7L);
        Role role = Role.builder().viewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.REQUESTS)))
                .viewOtherPermissions(new HashSet<>()).build();
        User user = new User(); user.setId(12L); user.setCompany(company); user.setRole(role);
        Request request = new Request(); request.setId(55L); request.setCompany(company); request.setCreatedBy(11L);
        GeneratedDocument document = new GeneratedDocument(); document.setId(57L); document.setCompany(company);
        document.setSourceType("REQUEST"); document.setSourceId(55L); document.setStoragePath("private/request.pdf");
        when(repository.findById(57L)).thenReturn(Optional.of(document));
        when(requestService.findById(55L)).thenReturn(Optional.of(request));

        var exception = assertThrows(com.grash.exception.CustomException.class,
                () -> service.download(57L, user));

        assertEquals(org.springframework.http.HttpStatus.FORBIDDEN, exception.getHttpStatus());
        verifyNoInteractions(storageFactory, accessEventRepository);
    }

    @Test
    void successfulArchivedPdfDownloadRecordsActorDocumentAndOutcome() {
        Company company = new Company(); company.setId(7L);
        Role role = Role.builder().viewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.REQUESTS)))
                .viewOtherPermissions(new HashSet<>()).build();
        User user = new User(); user.setId(12L); user.setFirstName("Amadou"); user.setLastName("Buyer");
        user.setUsername("buyer"); user.setCompany(company); user.setRole(role);
        Request request = new Request(); request.setId(55L); request.setCompany(company); request.setCreatedBy(12L);
        GeneratedDocument document = new GeneratedDocument(); document.setId(57L); document.setCompany(company);
        document.setSourceType("REQUEST"); document.setSourceId(55L); document.setStoragePath("private/request.pdf");
        document.setFileName("request-55.pdf");
        when(repository.findById(57L)).thenReturn(Optional.of(document));
        when(requestService.findById(55L)).thenReturn(Optional.of(request));
        when(storageFactory.getStorageService()).thenReturn(storage);
        when(storage.download("private/request.pdf")).thenReturn(new byte[]{'%', 'P', 'D', 'F'});

        var downloaded = service.download(57L, user);

        assertArrayEquals(new byte[]{'%', 'P', 'D', 'F'}, downloaded.data());
        var captor = org.mockito.ArgumentCaptor.forClass(com.grash.model.GeneratedDocumentAccessEvent.class);
        verify(accessEventRepository).save(captor.capture());
        assertEquals(57L, captor.getValue().getGeneratedDocumentId());
        assertEquals("REQUEST", captor.getValue().getSourceType());
        assertEquals(12L, captor.getValue().getActorId());
        assertEquals("Amadou Buyer", captor.getValue().getActorName());
        assertEquals("SUCCESS", captor.getValue().getOutcome());
    }

    @Test
    void failedStorageDownloadIsRecordedBeforeTheErrorIsReturned() {
        Company company = new Company(); company.setId(7L);
        Role role = Role.builder().viewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.REQUESTS)))
                .viewOtherPermissions(new HashSet<>()).build();
        User user = new User(); user.setId(12L); user.setFirstName("Amadou"); user.setLastName("Buyer");
        user.setUsername("buyer"); user.setCompany(company); user.setRole(role);
        Request request = new Request(); request.setId(55L); request.setCompany(company); request.setCreatedBy(12L);
        GeneratedDocument document = new GeneratedDocument(); document.setId(57L); document.setCompany(company);
        document.setSourceType("REQUEST"); document.setSourceId(55L); document.setStoragePath("private/request.pdf");
        when(repository.findById(57L)).thenReturn(Optional.of(document));
        when(requestService.findById(55L)).thenReturn(Optional.of(request));
        when(storageFactory.getStorageService()).thenReturn(storage);
        when(storage.download("private/request.pdf")).thenThrow(new IllegalStateException("storage unavailable"));

        assertThrows(IllegalStateException.class, () -> service.download(57L, user));

        var captor = org.mockito.ArgumentCaptor.forClass(com.grash.model.GeneratedDocumentAccessEvent.class);
        verify(accessEventRepository).save(captor.capture());
        assertEquals("FAILED", captor.getValue().getOutcome());
    }

    @Test
    void templatePreviewRequiresCurrentWorkOrderVisibilityAndDoesNotLoadTemplateForDeniedUser() {
        Company company = new Company(); company.setId(7L);
        Role role = Role.builder().viewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.WORK_ORDERS)))
                .viewOtherPermissions(new HashSet<>()).build();
        User user = new User(); user.setId(12L); user.setCompany(company); user.setRole(role);
        WorkOrder order = new WorkOrder(); order.setId(42L); order.setCompany(company); order.setCreatedBy(11L);
        when(workOrderService.findById(42L)).thenReturn(Optional.of(order));

        var exception = assertThrows(com.grash.exception.CustomException.class,
                () -> service.previewWorkOrderReportFromTemplate(42L, 9L, user));

        assertEquals(org.springframework.http.HttpStatus.FORBIDDEN, exception.getHttpStatus());
        verifyNoInteractions(templateRepository, templateValidator, providerRegistry, templateRenderer,
                storageFactory, repository);
    }

    @Test
    void templateOptionsExposeOnlyPublishedWorkOrderTemplatesAfterVisibilityCheck() {
        Company company = new Company(); company.setId(7L);
        Role role = Role.builder().viewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.WORK_ORDERS)))
                .viewOtherPermissions(new HashSet<>()).build();
        User user = new User(); user.setId(11L); user.setCompany(company); user.setRole(role);
        WorkOrder order = new WorkOrder(); order.setId(42L); order.setCompany(company); order.setCreatedBy(11L);
        DocumentType workOrderType = new DocumentType(); workOrderType.setCode("WORK_ORDER"); workOrderType.setProviderCode("WORK_ORDER");
        DocumentTemplateVersion publishedVersion = new DocumentTemplateVersion();
        publishedVersion.setId(19L); publishedVersion.setVersionNumber(3);
        publishedVersion.setStatus(DocumentTemplateStatus.PUBLISHED);
        DocumentTemplate published = new DocumentTemplate(); published.setId(9L);
        published.setName("Landscape Maintenance Report"); published.setDocumentType(workOrderType);
        published.setStatus(DocumentTemplateStatus.PUBLISHED); published.setDefault(true);
        published.setPublishedVersion(publishedVersion);
        DocumentTemplate draft = new DocumentTemplate(); draft.setId(10L);
        draft.setDocumentType(workOrderType); draft.setStatus(DocumentTemplateStatus.DRAFT);
        when(workOrderService.findById(42L)).thenReturn(Optional.of(order));
        when(templateRepository.findByCompany_IdOrderByUpdatedAtDesc(7L))
                .thenReturn(java.util.List.of(published, draft));

        var options = service.listPublishedWorkOrderReportTemplates(42L, user);

        assertEquals(1, options.size());
        assertEquals(9L, options.get(0).id());
        assertEquals(3, options.get(0).versionNumber());
        assertTrue(options.get(0).isDefault());
    }

    @Test
    void downloadIsDeniedWhenUserNoLongerCanViewSourceWorkOrder() {
        Company company = new Company(); company.setId(7L);
        Role role = Role.builder().viewPermissions(new HashSet<>())
                .viewOtherPermissions(new HashSet<>()).build();
        User user = new User(); user.setId(12L); user.setCompany(company); user.setRole(role);
        GeneratedDocument document = new GeneratedDocument();
        document.setId(5L); document.setCompany(company); document.setSourceType("WORK_ORDER");
        document.setSourceId(42L); document.setStoragePath("private/issued-report.pdf");
        WorkOrder order = new WorkOrder(); order.setId(42L); order.setCompany(company); order.setCreatedBy(11L);
        when(repository.findById(5L)).thenReturn(Optional.of(document));
        when(workOrderService.findById(42L)).thenReturn(Optional.of(order));

        var exception = assertThrows(com.grash.exception.CustomException.class,
                () -> service.download(5L, user));

        assertEquals(org.springframework.http.HttpStatus.FORBIDDEN, exception.getHttpStatus());
        verifyNoInteractions(storageFactory);
    }

    @Test
    void reportFieldCatalogIsAvailableOnlyToUsersWhoCanViewTheWorkOrder() {
        Company company = new Company(); company.setId(7L);
        Role role = Role.builder().viewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.WORK_ORDERS)))
                .viewOtherPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.WORK_ORDERS))).build();
        User user = new User(); user.setId(11L); user.setCompany(company); user.setRole(role);
        WorkOrder order = new WorkOrder(); order.setId(42L); order.setCompany(company); order.setCreatedBy(11L);
        when(workOrderService.findById(42L)).thenReturn(Optional.of(order));
        when(workOrderReportDataProvider.supports(anyString())).thenAnswer(invocation ->
                java.util.Set.of("workOrder.title", "company.registrationNumber")
                        .contains(invocation.getArgument(0)));

        var fields = service.listWorkOrderReportFields(42L, user);

        assertTrue(fields.stream().anyMatch(field -> field.key().equals("workOrder.title")));
        assertTrue(fields.stream().anyMatch(field -> field.key().equals("company.registrationNumber")));
        assertTrue(fields.stream().filter(field -> field.key().equals("workOrder.title"))
                .allMatch(ReportFieldDefinitionDTO::valueSupported));
        assertFalse(fields.stream().filter(field -> field.key().equals("workOrder.labor"))
                .findFirst().orElseThrow().valueSupported());
        assertTrue(fields.stream().filter(ReportFieldDefinitionDTO::sensitive)
                .allMatch(field -> field.reportConfigSection().equals("cost")));
        assertFalse(fields.stream().anyMatch(field -> field.key().contains("sql") || field.key().contains("expression")));
    }

    @Test
    void reportFieldCatalogDoesNotGrantAccessToAnotherUsersWorkOrder() {
        Company company = new Company(); company.setId(7L);
        Role role = Role.builder().viewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.WORK_ORDERS)))
                .viewOtherPermissions(new HashSet<>()).build();
        User user = new User(); user.setId(12L); user.setCompany(company); user.setRole(role);
        WorkOrder order = new WorkOrder(); order.setId(42L); order.setCompany(company); order.setCreatedBy(11L);
        when(workOrderService.findById(42L)).thenReturn(Optional.of(order));

        var exception = assertThrows(com.grash.exception.CustomException.class,
                () -> service.listWorkOrderReportFields(42L, user));

        assertEquals(org.springframework.http.HttpStatus.FORBIDDEN, exception.getHttpStatus());
    }

    @Test
    void reportFieldCatalogHidesWorkOrdersFromAnotherCompany() {
        Company requesterCompany = new Company(); requesterCompany.setId(7L);
        Company workOrderCompany = new Company(); workOrderCompany.setId(8L);
        Role role = Role.builder().viewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.WORK_ORDERS)))
                .viewOtherPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.WORK_ORDERS))).build();
        User user = new User(); user.setId(11L); user.setCompany(requesterCompany); user.setRole(role);
        WorkOrder order = new WorkOrder(); order.setId(42L); order.setCompany(workOrderCompany);
        when(workOrderService.findById(42L)).thenReturn(Optional.of(order));

        var exception = assertThrows(com.grash.exception.CustomException.class,
                () -> service.listWorkOrderReportFields(42L, user));

        assertEquals(org.springframework.http.HttpStatus.NOT_FOUND, exception.getHttpStatus());
    }

    @Test
    void previewDataRequiresWorkOrderVisibilityAndReturnsOnlyRequestedFields() {
        Company company = new Company(); company.setId(7L);
        Role role = Role.builder().viewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.WORK_ORDERS)))
                .viewOtherPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.WORK_ORDERS))).build();
        User user = new User(); user.setId(11L); user.setCompany(company); user.setRole(role);
        WorkOrder order = new WorkOrder(); order.setId(42L); order.setCompany(company); order.setCreatedBy(11L);
        order.setTitle("Inspect pump");
        when(workOrderService.findById(42L)).thenReturn(Optional.of(order));
        when(documentContextResolver.resolve(order)).thenReturn(new DocumentContextResolver.DocumentContext(
                "Company", null, null, null, null, null, null, "", null, "UTC",
                com.grash.model.enums.Language.EN, java.util.Locale.ENGLISH, null, null));
        when(workOrderReportDataProvider.resolve(eq(order), any(), anySet()))
                .thenReturn(java.util.Map.of("workOrder.title", "Inspect pump"));

        var data = service.previewWorkOrderReportData(42L, java.util.List.of("workOrder.title"), user);

        assertEquals(java.util.Map.of("workOrder.title", "Inspect pump"), data);
        verify(documentContextResolver).resolve(order);
        verify(workOrderReportDataProvider).resolve(eq(order), any(), anySet());
    }

    @Test
    void previewDataRejectsUnauthorizedAndCrossCompanyWorkOrders() {
        Company requesterCompany = new Company(); requesterCompany.setId(7L);
        Company otherCompany = new Company(); otherCompany.setId(8L);
        Role role = Role.builder().viewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.WORK_ORDERS)))
                .viewOtherPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.WORK_ORDERS))).build();
        User user = new User(); user.setId(11L); user.setCompany(requesterCompany); user.setRole(role);
        WorkOrder order = new WorkOrder(); order.setId(42L); order.setCompany(otherCompany);
        when(workOrderService.findById(42L)).thenReturn(Optional.of(order));

        var exception = assertThrows(com.grash.exception.CustomException.class,
                () -> service.previewWorkOrderReportData(42L, java.util.List.of("workOrder.title"), user));

        assertEquals(org.springframework.http.HttpStatus.NOT_FOUND, exception.getHttpStatus());
        verifyNoInteractions(documentContextResolver);
        verifyNoInteractions(workOrderReportDataProvider);
    }

    @Test
    void previewDataRejectsWorkOrderOutsideUsersObjectVisibility() {
        Company company = new Company(); company.setId(7L);
        Role role = Role.builder().viewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.WORK_ORDERS)))
                .viewOtherPermissions(new HashSet<>()).build();
        User user = new User(); user.setId(12L); user.setCompany(company); user.setRole(role);
        WorkOrder order = new WorkOrder(); order.setId(42L); order.setCompany(company); order.setCreatedBy(11L);
        when(workOrderService.findById(42L)).thenReturn(Optional.of(order));

        var exception = assertThrows(com.grash.exception.CustomException.class,
                () -> service.previewWorkOrderReportData(42L, java.util.List.of("workOrder.title"), user));

        assertEquals(org.springframework.http.HttpStatus.FORBIDDEN, exception.getHttpStatus());
        verifyNoInteractions(documentContextResolver, workOrderReportDataProvider);
    }
}
