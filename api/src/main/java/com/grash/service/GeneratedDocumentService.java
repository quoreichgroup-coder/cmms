package com.grash.service;

import com.grash.dto.GeneratedDocumentDTO;
import com.grash.dto.ReportFieldDefinitionDTO;
import com.grash.dto.ReportFieldDiagnosisDTO;
import com.grash.dto.ReportTablePreviewDTO;
import com.grash.dto.ReportConfig;
import com.grash.dto.PublishedReportTemplateOptionDTO;
import com.grash.exception.CustomException;
import com.grash.factory.StorageServiceFactory;
import com.grash.model.GeneratedDocument;
import com.grash.model.Company;
import com.grash.model.User;
import com.grash.model.WorkOrder;
import com.grash.model.Request;
import com.grash.model.abstracts.WorkOrderBase;
import com.grash.repository.GeneratedDocumentRepository;
import lombok.RequiredArgsConstructor;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.grash.model.DocumentTemplate;
import com.grash.model.DocumentTemplateVersion;
import com.grash.model.enums.DocumentTemplateStatus;
import com.grash.model.enums.PermissionEntity;
import com.grash.repository.DocumentTemplateRepository;
import org.springframework.context.MessageSource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.util.Date;
import java.util.HexFormat;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GeneratedDocumentService {
    private static final String TEMPLATE_VERSION = "work-order-report-v1";
    private static final ObjectMapper SNAPSHOT_MAPPER = new ObjectMapper();
    private static final List<ReportFieldDefinitionDTO> WORK_ORDER_REPORT_FIELDS = List.of(
            new ReportFieldDefinitionDTO("workOrder.customId", "report.field.workOrder.customId", "workOrder", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("workOrder.title", "report.field.workOrder.title", "workOrder", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("workOrder.description", "report.field.workOrder.description", "workOrder", "text", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("workOrder.status", "report.field.workOrder.status", "workOrder", "enum", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("workOrder.priority", "report.field.workOrder.priority", "workOrder", "enum", false, false, "priority"),
            new ReportFieldDefinitionDTO("workOrder.dueDate", "report.field.workOrder.dueDate", "workOrder", "date", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("workOrder.completedAt", "report.field.workOrder.completedAt", "workOrder", "dateTime", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("workOrder.estimatedDuration", "report.field.workOrder.estimatedDuration", "workOrder", "duration", false, false, "estimatedTime"),
            new ReportFieldDefinitionDTO("workOrder.actualDuration", "report.field.workOrder.actualDuration", "workOrder", "duration", true, false, "laborTime"),
            new ReportFieldDefinitionDTO("workOrder.category", "report.field.workOrder.category", "workOrder", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("asset.name", "report.field.asset.name", "asset", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("location.name", "report.field.location.name", "location", "string", false, false, "locationAddress"),
            new ReportFieldDefinitionDTO("asset.serialNumber", "report.field.asset.serialNumber", "asset", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("workOrder.team", "report.field.workOrder.team", "people", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("workOrder.completedBy", "report.field.workOrder.completedBy", "people", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("workOrder.primaryUser", "report.field.workOrder.primaryUser", "people", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("workOrder.customers", "report.field.workOrder.customers", "people", "string", true, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("workOrder.createdBy", "report.field.workOrder.createdBy", "people", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("workOrder.feedback", "report.field.workOrder.feedback", "execution", "text", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("workOrder.signature", "report.field.workOrder.signature", "execution", "image", false, false, "signature"),
            new ReportFieldDefinitionDTO("workOrder.customFields", "report.field.workOrder.customFields", "workOrder", "object", true, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("site.name", "report.field.site.name", "organization", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("company.name", "report.field.company.name", "organization", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("company.legalName", "report.field.company.legalName", "organization", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("company.registeredAddress", "report.field.company.registeredAddress", "organization", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("company.registrationNumber", "report.field.company.registrationNumber", "organization", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("company.taxNumber", "report.field.company.taxNumber", "organization", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("company.phone", "report.field.company.phone", "organization", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("company.email", "report.field.company.email", "organization", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("workOrder.assignedTo", "report.field.workOrder.assignedTo", "people", "string", true, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("workOrder.tasks", "report.field.workOrder.tasks", "execution", "object", true, false, "tasks"),
            new ReportFieldDefinitionDTO("workOrder.comments", "report.field.workOrder.comments", "execution", "object", true, false, "comments"),
            new ReportFieldDefinitionDTO("workOrder.history", "report.field.workOrder.history", "execution", "object", true, false, "workOrderHistory"),
            new ReportFieldDefinitionDTO("workOrder.parts", "report.field.workOrder.parts", "costs", "object", true, true, "cost"),
            new ReportFieldDefinitionDTO("workOrder.labor", "report.field.workOrder.labor", "costs", "object", true, true, "cost"),
            new ReportFieldDefinitionDTO("workOrder.additionalCosts", "report.field.workOrder.additionalCosts", "costs", "object", true, true, "cost"),
            new ReportFieldDefinitionDTO("workOrder.relations", "report.field.workOrder.relations", "relatedRecords", "object", true, false, "relations"),
            new ReportFieldDefinitionDTO("workOrder.files", "report.field.workOrder.files", "attachments", "file", true, false, "files"),
            new ReportFieldDefinitionDTO("workOrder.executionTasks", "report.field.workOrder.executionTasks", "execution", "table", true, false, "tasks"),
            new ReportFieldDefinitionDTO("workOrder.laborTimeEntries", "report.field.workOrder.laborTimeEntries", "execution", "table", true, false, "laborTime"),
            new ReportFieldDefinitionDTO("workOrder.materialsUsed", "report.field.workOrder.materialsUsed", "materials", "table", true, false, "parts")
    );
    private static final List<ReportFieldDefinitionDTO> REQUEST_REPORT_FIELDS = List.of(
            new ReportFieldDefinitionDTO("request.customId", "report.field.request.customId", "request", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("request.title", "report.field.request.title", "request", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("request.description", "report.field.request.description", "request", "text", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("request.priority", "report.field.request.priority", "request", "enum", false, false, "priority"),
            new ReportFieldDefinitionDTO("request.dueDate", "report.field.request.dueDate", "request", "date", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("request.estimatedDuration", "report.field.request.estimatedDuration", "request", "duration", false, false, "estimatedTime"),
            new ReportFieldDefinitionDTO("request.contact", "report.field.request.contact", "request", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("request.cancelled", "report.field.request.cancelled", "request", "boolean", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("asset.name", "report.field.asset.name", "asset", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("asset.serialNumber", "report.field.asset.serialNumber", "asset", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("location.name", "report.field.location.name", "location", "string", false, false, "locationAddress"),
            new ReportFieldDefinitionDTO("request.team", "report.field.request.team", "people", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("site.name", "report.field.site.name", "organization", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("company.name", "report.field.company.name", "organization", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("company.legalName", "report.field.company.legalName", "organization", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("company.registeredAddress", "report.field.company.registeredAddress", "organization", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("company.registrationNumber", "report.field.company.registrationNumber", "organization", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("company.taxNumber", "report.field.company.taxNumber", "organization", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("company.phone", "report.field.company.phone", "organization", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("company.email", "report.field.company.email", "organization", "string", false, false, "workOrderInformation")
    );
    private final GeneratedDocumentRepository repository;
    private final WorkOrderService workOrderService;
    private final StorageServiceFactory storageServiceFactory;
    private final DocumentContextResolver documentContextResolver;
    private final WorkOrderReportDataProvider workOrderReportDataProvider;
    private final RequestReportDataProvider requestReportDataProvider;
    private final RequestService requestService;
    private final DocumentTemplateRepository templateRepository;
    private final ReportTemplateConfigurationValidator templateValidator;
    private final PdfmeTemplateConfigurationValidator pdfmeValidator;
    private final PdfmeRendererClient pdfmeRendererClient;
    private final DocumentDataProviderRegistry providerRegistry;
    private final ConfigurableWorkOrderReportRenderer templateRenderer;
    private final MessageSource messageSource;

    @Transactional(readOnly = true)
    public List<ReportFieldDefinitionDTO> listWorkOrderReportFields(Long workOrderId, User user) {
        WorkOrder workOrder = workOrderService.findById(workOrderId)
                .orElseThrow(() -> new CustomException("Work order not found", HttpStatus.NOT_FOUND));
        if (!workOrder.getCompany().getId().equals(user.getCompany().getId()))
            throw new CustomException("Work order not found", HttpStatus.NOT_FOUND);
        if (!workOrder.canBeViewedBy(user))
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        return WORK_ORDER_REPORT_FIELDS.stream()
                .map(field -> field.withValueSupport(workOrderReportDataProvider.supports(field.key())))
                .toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> previewWorkOrderReportData(Long workOrderId, List<String> requestedFields, User user) {
        WorkOrder workOrder = workOrderService.findById(workOrderId)
                .filter(wo -> wo.getCompany() != null && user.getCompany() != null
                        && wo.getCompany().getId().equals(user.getCompany().getId()))
                .orElseThrow(() -> new CustomException("Work order not found", HttpStatus.NOT_FOUND));
        if (!workOrder.canBeViewedBy(user))
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        DocumentContextResolver.DocumentContext context = documentContextResolver.resolve(workOrder);
        return workOrderReportDataProvider.resolve(workOrder, context,
                requestedFields == null ? null : new java.util.LinkedHashSet<>(requestedFields));
    }

    @Transactional(readOnly = true)
    public Map<String, ReportFieldDiagnosisDTO> diagnoseWorkOrderReportData(
            Long workOrderId, List<String> requestedFields, User user) {
        WorkOrder workOrder = workOrderService.findById(workOrderId)
                .filter(wo -> wo.getCompany() != null && user.getCompany() != null
                        && wo.getCompany().getId().equals(user.getCompany().getId()))
                .orElseThrow(() -> new CustomException("Work order not found", HttpStatus.NOT_FOUND));
        if (!workOrder.canBeViewedBy(user))
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        DocumentContextResolver.DocumentContext context = documentContextResolver.resolve(workOrder);
        return workOrderReportDataProvider.diagnose(workOrder, context,
                requestedFields == null ? null : new java.util.LinkedHashSet<>(requestedFields));
    }

    @Transactional(readOnly = true)
    public ReportTablePreviewDTO previewWorkOrderReportTable(Long workOrderId, String binding,
                                                              List<String> columns, User user) {
        WorkOrder workOrder = workOrderService.findById(workOrderId)
                .filter(wo -> wo.getCompany() != null && user.getCompany() != null
                        && wo.getCompany().getId().equals(user.getCompany().getId()))
                .orElseThrow(() -> new CustomException("Work order not found", HttpStatus.NOT_FOUND));
        if (!workOrder.canBeViewedBy(user))
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        DocumentContextResolver.DocumentContext context = documentContextResolver.resolve(workOrder);
        return workOrderReportDataProvider.previewTable(workOrder, context, binding, columns);
    }

    @Transactional(readOnly = true)
    public List<ReportFieldDefinitionDTO> listRequestReportFields(Long requestId, User user) {
        Request request = findAuthorizedCompanyRequest(requestId, user);
        if (!request.canBeViewedBy(user)) throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        return REQUEST_REPORT_FIELDS.stream()
                .map(field -> field.withValueSupport(requestReportDataProvider.supports(field.key())))
                .toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> previewRequestReportData(Long requestId, List<String> requestedFields, User user) {
        Request request = findAuthorizedCompanyRequest(requestId, user);
        if (!request.canBeViewedBy(user)) throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        DocumentContextResolver.DocumentContext context = documentContextResolver.resolve(request);
        return requestReportDataProvider.resolve(request, context,
                requestedFields == null ? null : new java.util.LinkedHashSet<>(requestedFields));
    }

    private Request findAuthorizedCompanyRequest(Long requestId, User user) {
        if (user.getCompany() == null) throw new CustomException("Request not found", HttpStatus.NOT_FOUND);
        return requestService.findById(requestId)
                .filter(request -> request.getCompany() != null
                        && request.getCompany().getId().equals(user.getCompany().getId()))
                .orElseThrow(() -> new CustomException("Request not found", HttpStatus.NOT_FOUND));
    }

    @Transactional
    public GeneratedDocumentDTO issueWorkOrderReport(Long workOrderId, ReportConfig config, User user) {
        WorkOrder workOrder = workOrderService.findById(workOrderId)
                .filter(wo -> wo.getCompany().getId().equals(user.getCompany().getId()))
                .orElseThrow(() -> new CustomException("Work order not found", HttpStatus.NOT_FOUND));
        if (!workOrder.canIssueReportBy(user))
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);

        byte[] pdf = workOrderService.generatePdfBytes(workOrder, user, config);
        String fileName = "WorkOrder-" + workOrder.getId() + "-" + UUID.randomUUID() + ".pdf";
        String path = storageServiceFactory.getStorageService().upload(
                pdf, fileName, "issued-documents/" + user.getCompany().getId() + "/work-orders");

        GeneratedDocument document = new GeneratedDocument();
        document.setDocumentType("WORK_ORDER_REPORT");
        document.setCompany(user.getCompany());
        document.setSourceType("WORK_ORDER");
        document.setSourceId(workOrderId);
        document.setSite(workOrder.getSite());
        document.setFileName(fileName);
        document.setStoragePath(path);
        document.setSha256(sha256(pdf));
        DocumentContextResolver.DocumentContext context = documentContextResolver.resolve(workOrder);
        document.setLocale(context.language().name());
        document.setTemplateVersion(TEMPLATE_VERSION);
        document.setRenderSnapshot(createSnapshot(context, config));
        document.setIssuedAt(new Date());
        document.setIssuedBy(user.getId());
        return toDto(repository.save(document));
    }

    @Transactional
    public GeneratedDocumentDTO issueWorkOrderReportFromTemplate(Long workOrderId, Long templateId, User user) {
        WorkOrder workOrder = findAuthorizedCompanyWorkOrder(workOrderId, user);
        if (!workOrder.canIssueReportBy(user))
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        DocumentTemplate template = findPublishedTemplate(templateId, user, "WORK_ORDER", workOrder.getSite());
        DocumentTemplateVersion version = requirePublishedVersion(template);
        RenderedTemplate rendered = renderTemplate(template, version, workOrder, user);

        String fileName = "WorkOrder-" + workOrder.getId() + "-" + UUID.randomUUID() + ".pdf";
        String path = storageServiceFactory.getStorageService().upload(
                rendered.pdf(), fileName, "issued-documents/" + user.getCompany().getId() + "/work-orders");
        GeneratedDocument document = new GeneratedDocument();
        document.setDocumentType("WORK_ORDER_REPORT");
        document.setCompany(user.getCompany());
        document.setSourceType("WORK_ORDER");
        document.setSourceId(workOrderId);
        document.setSite(workOrder.getSite());
        document.setFileName(fileName);
        document.setStoragePath(path);
        document.setSha256(sha256(rendered.pdf()));
        document.setLocale(rendered.context().language().name());
        document.setTemplateVersion("template-" + template.getId() + "-v" + version.getVersionNumber());
        document.setTemplateVersionEntity(version);
        document.setRenderSnapshot(rendered.snapshot());
        document.setIssuedAt(new Date());
        document.setIssuedBy(user.getId());
        return toDto(repository.save(document));
    }

    @Transactional
    public GeneratedDocumentDTO issueRequestReportFromTemplate(Long requestId, Long templateId, User user) {
        Request request = findAuthorizedCompanyRequest(requestId, user);
        if (!request.canBeViewedBy(user) || !request.canBeEditedBy(user))
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        DocumentTemplate template = findPublishedTemplate(templateId, user, "REQUEST", request.getSite());
        DocumentTemplateVersion version = requirePublishedVersion(template);
        RenderedTemplate rendered = renderTemplate(template, version, request, user);

        String fileName = "Request-" + request.getId() + "-" + UUID.randomUUID() + ".pdf";
        String path = storageServiceFactory.getStorageService().upload(rendered.pdf(), fileName,
                "issued-documents/" + user.getCompany().getId() + "/requests");
        GeneratedDocument document = new GeneratedDocument();
        document.setDocumentType("MAINTENANCE_REQUEST_REPORT");
        document.setCompany(user.getCompany());
        document.setSourceType("REQUEST");
        document.setSourceId(requestId);
        document.setSite(request.getSite());
        document.setFileName(fileName);
        document.setStoragePath(path);
        document.setSha256(sha256(rendered.pdf()));
        document.setLocale(rendered.context().language().name());
        document.setTemplateVersion("template-" + template.getId() + "-v" + version.getVersionNumber());
        document.setTemplateVersionEntity(version);
        document.setRenderSnapshot(rendered.snapshot());
        document.setIssuedAt(new Date());
        document.setIssuedBy(user.getId());
        return toDto(repository.save(document));
    }

    @Transactional(readOnly = true)
    public byte[] previewWorkOrderReportFromTemplate(Long workOrderId, Long templateId, User user) {
        WorkOrder workOrder = findAuthorizedCompanyWorkOrder(workOrderId, user);
        if (!workOrder.canBeViewedBy(user))
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        DocumentTemplate template = findPublishedTemplate(templateId, user, "WORK_ORDER", workOrder.getSite());
        return renderTemplate(template, requirePublishedVersion(template), workOrder, user).pdf();
    }

    @Transactional(readOnly = true)
    public byte[] previewRequestReportFromTemplate(Long requestId, Long templateId, User user) {
        Request request = findAuthorizedCompanyRequest(requestId, user);
        if (!request.canBeViewedBy(user)) throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        DocumentTemplate template = findPublishedTemplate(templateId, user, "REQUEST", request.getSite());
        return renderTemplate(template, requirePublishedVersion(template), request, user).pdf();
    }

    @Transactional(readOnly = true)
    public byte[] previewRequestDocumentTemplate(Long templateId, Long requestId, User user) {
        ensureCanManageTemplates(user, false);
        DocumentTemplate template = findCompanyTemplate(templateId, user)
                .filter(item -> item.getStatus() != DocumentTemplateStatus.ARCHIVED)
                .orElseThrow(() -> new CustomException("Document template not found", HttpStatus.NOT_FOUND));
        if (!"REQUEST".equals(template.getDocumentType().getProviderCode()))
            throw new CustomException("Use the source-specific preview route for this template", HttpStatus.BAD_REQUEST);
        Request request = findAuthorizedCompanyRequest(requestId, user);
        if (!request.canBeViewedBy(user)) throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        requireTemplateSite(template, request.getSite());
        DocumentTemplateVersion version = template.getDraftVersion() != null
                ? template.getDraftVersion() : requirePublishedVersion(template);
        return renderTemplate(template, version, request, user).pdf();
    }

    @Transactional(readOnly = true)
    public List<GeneratedDocumentDTO> listRequestReports(Long requestId, User user) {
        Request request = findAuthorizedCompanyRequest(requestId, user);
        if (!request.canBeViewedBy(user)) throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        return repository.findByCompany_IdAndSourceTypeAndSourceIdOrderByIssuedAtDesc(
                user.getCompany().getId(), "REQUEST", requestId).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<PublishedReportTemplateOptionDTO> listPublishedRequestReportTemplates(Long requestId, User user) {
        Request request = findAuthorizedCompanyRequest(requestId, user);
        if (!request.canBeViewedBy(user)) throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        return listPublishedTemplatesForType(user, "REQUEST", request.getSite());
    }

    @Transactional(readOnly = true)
    public byte[] previewDocumentTemplate(Long templateId, Long workOrderId, User user) {
        ensureCanManageTemplates(user, false);
        DocumentTemplate template = findCompanyTemplate(templateId, user)
                .filter(item -> item.getStatus() != DocumentTemplateStatus.ARCHIVED)
                .orElseThrow(() -> new CustomException("Document template not found", HttpStatus.NOT_FOUND));
        if (!"WORK_ORDER".equals(template.getDocumentType().getProviderCode()))
            throw new CustomException("Use the source-specific preview route for this template", HttpStatus.BAD_REQUEST);
        WorkOrder workOrder = findAuthorizedCompanyWorkOrder(workOrderId, user);
        if (!workOrder.canBeViewedBy(user))
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        requireTemplateSite(template, workOrder.getSite());
        DocumentTemplateVersion version = template.getDraftVersion() != null
                ? template.getDraftVersion() : requirePublishedVersion(template);
        return renderTemplate(template, version, workOrder, user).pdf();
    }

    @Transactional(readOnly = true)
    public List<PublishedReportTemplateOptionDTO> listPublishedWorkOrderReportTemplates(Long workOrderId, User user) {
        WorkOrder workOrder = findAuthorizedCompanyWorkOrder(workOrderId, user);
        if (!workOrder.canBeViewedBy(user))
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        return listPublishedTemplatesForType(user, "WORK_ORDER", workOrder.getSite());
    }

    private List<PublishedReportTemplateOptionDTO> listPublishedTemplatesForType(User user, String typeCode, com.grash.model.Site site) {
        List<DocumentTemplate> eligible = templateRepository.findByCompany_IdOrderByUpdatedAtDesc(user.getCompany().getId()).stream()
                .filter(template -> template.getStatus() == DocumentTemplateStatus.PUBLISHED)
                .filter(template -> typeCode.equals(template.getDocumentType().getProviderCode()))
                .filter(template -> template.getPublishedVersion() != null
                        && template.getPublishedVersion().getStatus() == DocumentTemplateStatus.PUBLISHED)
                .filter(template -> isAvailableForSite(template, site))
                .toList();
        boolean hasSiteDefault = site != null && eligible.stream().anyMatch(template -> template.isDefault()
                && "SITE".equals(template.getDefaultScope()) && template.getSite() != null
                && site.getId().equals(template.getSite().getId()));
        return eligible.stream().map(template -> {
            boolean siteDefault = "SITE".equals(template.getDefaultScope()) && template.getSite() != null
                    && site != null && site.getId().equals(template.getSite().getId());
            boolean effectiveDefault = template.isDefault() && (siteDefault
                    || (!hasSiteDefault && "COMPANY".equals(template.getDefaultScope())));
            return new PublishedReportTemplateOptionDTO(template.getId(), template.getName(),
                    template.getPublishedVersion().getVersionNumber(), effectiveDefault,
                    template.getDefaultScope(), template.getSite() == null ? null : template.getSite().getName());
        }).toList();
    }

    private boolean isAvailableForSite(DocumentTemplate template, com.grash.model.Site site) {
        if ("SITE".equals(template.getDefaultScope())) return site != null && template.getSite() != null
                && site.getId().equals(template.getSite().getId());
        return true;
    }

    private void requireTemplateSite(DocumentTemplate template, com.grash.model.Site site) {
        if (!isAvailableForSite(template, site))
            throw new CustomException("Document template is not available for this site", HttpStatus.NOT_FOUND);
    }

    private WorkOrder findAuthorizedCompanyWorkOrder(Long workOrderId, User user) {
        return workOrderService.findById(workOrderId)
                .filter(wo -> wo.getCompany() != null && user.getCompany() != null
                        && wo.getCompany().getId().equals(user.getCompany().getId()))
                .orElseThrow(() -> new CustomException("Work order not found", HttpStatus.NOT_FOUND));
    }

    private DocumentTemplate findPublishedTemplate(Long templateId, User user) {
        return findPublishedTemplate(templateId, user, "WORK_ORDER", null);
    }

    private DocumentTemplate findPublishedTemplate(Long templateId, User user, String typeCode, com.grash.model.Site site) {
        DocumentTemplate template = templateRepository.findByIdAndCompany_IdAndStatus(
                        templateId, user.getCompany().getId(), DocumentTemplateStatus.PUBLISHED)
                .filter(item -> typeCode.equals(item.getDocumentType().getProviderCode()))
                .orElseThrow(() -> new CustomException("Published document template not found", HttpStatus.NOT_FOUND));
        requireTemplateSite(template, site);
        return template;
    }

    private java.util.Optional<DocumentTemplate> findCompanyTemplate(Long templateId, User user) {
        if (user.getCompany() == null) return java.util.Optional.empty();
        return templateRepository.findByIdAndCompany_Id(templateId, user.getCompany().getId());
    }

    private void ensureCanManageTemplates(User user, boolean edit) {
        boolean canViewSettings = user.getRole() != null
                && user.getRole().getViewPermissions().contains(PermissionEntity.SETTINGS);
        boolean canEditSettings = user.getRole() != null
                && user.getRole().getEditOtherPermissions().contains(PermissionEntity.SETTINGS);
        boolean canViewTemplates = user.getRole() != null
                && user.getRole().getViewPermissions().contains(PermissionEntity.DOCUMENT_TEMPLATES);
        boolean canEditTemplates = user.getRole() != null
                && user.getRole().getEditOtherPermissions().contains(PermissionEntity.DOCUMENT_TEMPLATES);
        boolean canManage = canViewSettings && (!edit || canEditSettings)
                || canViewTemplates && (!edit || canEditTemplates);
        if (user.getCompany() == null || (!user.isOwnsCompany() && !canManage))
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
    }

    private DocumentTemplateVersion requirePublishedVersion(DocumentTemplate template) {
        DocumentTemplateVersion version = template.getPublishedVersion();
        if (version == null || version.getStatus() != DocumentTemplateStatus.PUBLISHED)
            throw new CustomException("Published document template version not found", HttpStatus.NOT_FOUND);
        return version;
    }

    private RenderedTemplate renderTemplate(DocumentTemplate template, DocumentTemplateVersion version,
                                            WorkOrderBase source, User user) {
        if (PdfmeTemplateConfigurationValidator.isPdfme(version.getConfiguration())) {
            if (!(source instanceof WorkOrder) || !"WORK_ORDER".equals(template.getDocumentType().getProviderCode()))
                throw new CustomException("PDFME is currently supported for Work Orders only", HttpStatus.BAD_REQUEST);
            JsonNode pdfme = pdfmeValidator.validate(version.getConfiguration(),
                    template.getDocumentType().getCode(), template.getDocumentType().getProviderCode());
            DocumentContextResolver.DocumentContext pdfmeContext = documentContextResolver.resolve(source);
            java.util.LinkedHashSet<String> bindings = new java.util.LinkedHashSet<>(pdfmeValidator.dataBindings(pdfme));
            Map<String, Object> resolved = providerRegistry.require("WORK_ORDER").resolve(source, pdfmeContext, bindings);
            byte[] pdf = pdfmeRendererClient.render(pdfme, List.of(toPdfmeInput(pdfme, resolved, pdfmeContext)));
            String snapshot = createTemplateSnapshot(pdfmeContext, pdfme, resolved,
                    template.getId(), version.getId(), version.getVersionNumber());
            return new RenderedTemplate(pdf, pdfmeContext, snapshot);
        }
        JsonNode configuration = templateValidator.validate(version.getConfiguration(),
                template.getDocumentType().getCode(), template.getDocumentType().getProviderCode());
        DocumentContextResolver.DocumentContext context = documentContextResolver.resolve(source);
        java.util.LinkedHashSet<String> selectedFields = new java.util.LinkedHashSet<>(
                templateValidator.visibleFields(configuration));
        Map<String, Object> values = providerRegistry.require(template.getDocumentType().getProviderCode())
                .resolve(source, context, selectedFields);
        List<ReportFieldDefinitionDTO> fieldDefinitions = "REQUEST".equals(template.getDocumentType().getProviderCode())
                ? REQUEST_REPORT_FIELDS : WORK_ORDER_REPORT_FIELDS;
        java.util.Locale locale = context.locale() == null ? java.util.Locale.ROOT : context.locale();
        List<ConfigurableWorkOrderReportRenderer.ReportBlock> blocks = new java.util.ArrayList<>();
        if ("2.0".equals(configuration.path("schemaVersion").asText())) {
            for (JsonNode section : configuration.path("layout")) {
                String sectionTitle = section.path("title").asText();
                int columns = section.path("columns").asInt(1);
                for (JsonNode item : section.path("items")) {
                    String field = item.path("fieldKey").asText();
                    String componentId = item.path("id").asText();
                    JsonNode style = item.path("style");
                    Integer fontSize = style.has("fontSize") ? style.path("fontSize").asInt() : null;
                    boolean bold = style.path("bold").asBoolean(false);
                    String alignment = style.path("alignment").asText("LEFT");
                    boolean accentTone = "ACCENT".equals(style.path("tone").asText());
                    if (isTableField(field)) {
                        ConfigurableWorkOrderReportRenderer.ReportTable table = reportTable(field, values, locale,
                                context.timeZone(), item.path("title").asText(null), integerList(item.path("columnWidths")),
                                stringList(item.path("tableColumns")));
                        blocks.add(new ConfigurableWorkOrderReportRenderer.ReportBlock(
                                "TABLE", null, table, sectionTitle, columns, section.path("id").asText(),
                                componentId, fontSize, bold, alignment, accentTone,
                                section.path("pageBreakBefore").asBoolean(false), false, false,
                                section.path("keepTogether").asBoolean(false)));
                    } else {
                        ReportFieldDefinitionDTO definition = fieldDefinitions.stream()
                                .filter(candidate -> candidate.key().equals(field)).findFirst()
                                .orElseThrow(() -> new CustomException("Unsupported report field", HttpStatus.BAD_REQUEST));
                        String defaultLabel = messageSource.getMessage(definition.labelKey(), null, field, locale);
                        String label = templateValidator.fieldLabel(configuration, field, defaultLabel);
                        ConfigurableWorkOrderReportRenderer.ReportRow row = new ConfigurableWorkOrderReportRenderer.ReportRow(
                                field, label, printable(values.get(field)));
                        blocks.add(new ConfigurableWorkOrderReportRenderer.ReportBlock(
                                "workOrder.signature".equals(field) ? "SIGNATURE" : "FIELD", row, null,
                                sectionTitle, columns, section.path("id").asText(), componentId,
                                fontSize, bold, alignment, accentTone,
                                section.path("pageBreakBefore").asBoolean(false),
                                item.path("hideIfEmpty").asBoolean(false),
                                item.path("fullWidth").asBoolean(false),
                                section.path("keepTogether").asBoolean(false)));
                    }
                }
            }
        } else {
            JsonNode customLabels = configuration.path("fieldLabels");
            for (String field : selectedFields) {
                if (isTableField(field)) {
                    ConfigurableWorkOrderReportRenderer.ReportTable table = reportTable(
                            field, values, locale, context.timeZone(), customLabel(customLabels, field, null));
                    if (!table.rows().isEmpty()) blocks.add(new ConfigurableWorkOrderReportRenderer.ReportBlock("TABLE", null, table));
                } else {
                    ReportFieldDefinitionDTO definition = fieldDefinitions.stream()
                            .filter(candidate -> candidate.key().equals(field)).findFirst()
                            .orElseThrow(() -> new CustomException("Unsupported report field", HttpStatus.BAD_REQUEST));
                    String defaultLabel = messageSource.getMessage(definition.labelKey(), null, field, locale);
                    String label = customLabel(customLabels, field, defaultLabel);
                    ConfigurableWorkOrderReportRenderer.ReportRow row =
                            new ConfigurableWorkOrderReportRenderer.ReportRow(field, label, printable(values.get(field)));
                    blocks.add(new ConfigurableWorkOrderReportRenderer.ReportBlock(
                            "workOrder.signature".equals(field) ? "SIGNATURE" : "FIELD", row, null));
                }
            }
        }
        String logoPath = user.getCompany().getLogo() == null ? null
                : com.grash.utils.PdfReportUtils.getImageReportStoragePath(user.getCompany().getLogo());
        String accentColor = user.getCompany().getCompanySettings().getGeneralPreferences().getColor();
        byte[] pdf = templateRenderer.render(configuration, blocks, context, logoPath, accentColor);
        String snapshot = createTemplateSnapshot(context, configuration, values,
                template.getId(), version.getId(), version.getVersionNumber());
        return new RenderedTemplate(pdf, context, snapshot);
    }

    private Map<String, Object> toPdfmeInput(JsonNode template, Map<String, Object> resolved,
                                             DocumentContextResolver.DocumentContext context) {
        Map<String, Object> input = new LinkedHashMap<>();
        for (JsonNode page : template.path("schemas")) {
            for (JsonNode schema : page) {
                String name = schema.path("name").asText();
                String type = schema.path("type").asText();
                if (name.startsWith("static:")) continue;
                Object value = resolved.get(name);
                if ("table".equals(type)) {
                    input.put(name, tableInput(name, value, schema, context));
                } else if (value == null) {
                    input.put(name, "workOrder.customFields".equals(name)
                            ? localized("report.noCustomFields", "No custom fields recorded", context.locale())
                            : "workOrder.files".equals(name)
                            ? localized("report.noAttachments", "No attachments recorded", context.locale()) : "");
                } else if (value instanceof String text) {
                    input.put(name, Set.of("workOrder.status", "workOrder.priority").contains(name)
                            ? localized(text, text, context.locale())
                            : name.endsWith("Date") || name.endsWith("At")
                            ? formatDateTime(text, context.locale(), context.timeZone()) : text);
                } else if (value instanceof List<?> values) {
                    String emptyMessage = switch (name) {
                        case "workOrder.customFields" -> localized("report.noCustomFields", "No custom fields recorded", context.locale());
                        case "workOrder.files" -> localized("report.noAttachments", "No attachments recorded", context.locale());
                        case "workOrder.comments" -> localized("report.noComments", "No comments recorded", context.locale());
                        case "workOrder.history" -> localized("report.noHistory", "No history available", context.locale());
                        case "workOrder.relations" -> localized("report.noRelations", "No related work orders", context.locale());
                        default -> "";
                    };
                    String separator = Set.of("workOrder.customFields", "workOrder.files", "workOrder.comments",
                            "workOrder.history", "workOrder.relations").contains(name) ? "\n" : ", ";
                    input.put(name, values.isEmpty() ? emptyMessage : values.stream().map(String::valueOf)
                            .collect(java.util.stream.Collectors.joining(separator)));
                } else {
                    input.put(name, String.valueOf(value));
                }
            }
        }
        return input;
    }

    private String tableInput(String name, Object value, JsonNode schema,
                              DocumentContextResolver.DocumentContext context) {
        List<String> defaultColumns = switch (name) {
            case "workOrder.executionTasks" -> List.of("step", "task", "result", "notes");
            case "workOrder.laborTimeEntries" -> List.of("technician", "activity", "startedAt", "durationHours", "status");
            case "workOrder.materialsUsed" -> List.of("part", "description", "quantity", "unit");
            default -> throw new CustomException("Unsupported PDFME table binding", HttpStatus.BAD_REQUEST);
        };
        List<String> columns = new java.util.ArrayList<>();
        JsonNode bindings = schema.path("columnBindings");
        if (bindings.isArray() && bindings.size() > 0) bindings.forEach(binding -> columns.add(binding.asText()));
        int headerCount = schema.path("head").size();
        if (!bindings.isArray() || bindings.size() == 0) {
            for (int index = 0; index < headerCount; index++) columns.add(index < defaultColumns.size() ? defaultColumns.get(index) : "");
        }
        if (headerCount < 1 || headerCount > 12 || columns.size() != headerCount
                || columns.stream().anyMatch(column -> !column.isBlank() && !defaultColumns.contains(column))
                || columns.stream().filter(column -> !column.isBlank()).distinct().count() != columns.stream().filter(column -> !column.isBlank()).count())
            throw new CustomException("Invalid PDFME table column bindings", HttpStatus.BAD_REQUEST);
        List<List<String>> rows = new java.util.ArrayList<>();
        if (value instanceof List<?> list) {
            for (Object item : list) {
                if (!(item instanceof Map<?, ?> row)) continue;
                List<String> cells = new java.util.ArrayList<>();
                for (String column : columns) {
                    Object cell = row.get(column);
                    if ("startedAt".equals(column)) cells.add(formatDateTime(cell, context.locale(), context.timeZone()));
                    else if ("result".equals(column) || "status".equals(column)
                            || "workOrder.status".equals(column) || "workOrder.priority".equals(column))
                        cells.add(cell == null ? "" : localized(String.valueOf(cell), String.valueOf(cell), context.locale()));
                    else cells.add(printable(cell));
                }
                rows.add(cells);
            }
        }
        if (rows.isEmpty()) {
            // Let the private PDFME renderer apply the table's configured empty-state
            // message. An empty JSON array is the signal it uses for this behavior.
            // An explicitly blank option disables the empty-state text.
            if (schema.has("qpmEmptyMessage")) return "[]";
            List<String> emptyRow = new java.util.ArrayList<>();
            emptyRow.add(localized("report.table.noRecords", "No records available", context.locale()));
            while (emptyRow.size() < headerCount) emptyRow.add("");
            rows.add(emptyRow);
        }
        try {
            return SNAPSHOT_MAPPER.writeValueAsString(rows);
        } catch (Exception exception) {
            throw new CustomException("PDFME table data could not be prepared", HttpStatus.BAD_GATEWAY);
        }
    }

    private String localized(String key, String fallback, java.util.Locale locale) {
        return messageSource.getMessage(key, null, fallback, locale == null ? java.util.Locale.ENGLISH : locale);
    }

    private record RenderedTemplate(byte[] pdf, DocumentContextResolver.DocumentContext context, String snapshot) { }

    @Transactional(readOnly = true)
    public List<GeneratedDocumentDTO> listWorkOrderReports(Long workOrderId, User user) {
        WorkOrder workOrder = workOrderService.findById(workOrderId)
                .orElseThrow(() -> new CustomException("Work order not found", HttpStatus.NOT_FOUND));
        if (!workOrder.getCompany().getId().equals(user.getCompany().getId()) || !workOrder.canBeViewedBy(user))
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        return repository.findByCompany_IdAndSourceTypeAndSourceIdOrderByIssuedAtDesc(
                user.getCompany().getId(), "WORK_ORDER", workOrderId).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public DownloadedDocument download(Long id, User user) {
        GeneratedDocument document = repository.findById(id)
                .orElseThrow(() -> new CustomException("Document not found", HttpStatus.NOT_FOUND));
        if (!document.getCompany().getId().equals(user.getCompany().getId()))
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        if ("WORK_ORDER".equals(document.getSourceType())) {
            WorkOrder workOrder = workOrderService.findById(document.getSourceId())
                    .orElseThrow(() -> new CustomException("Work order not found", HttpStatus.NOT_FOUND));
            if (!workOrder.canBeViewedBy(user)) throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        } else if ("REQUEST".equals(document.getSourceType())) {
            Request request = findAuthorizedCompanyRequest(document.getSourceId(), user);
            if (!request.canBeViewedBy(user)) throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        } else {
            throw new CustomException("Document source is not supported", HttpStatus.FORBIDDEN);
        }
        byte[] data = storageServiceFactory.getStorageService().download(document.getStoragePath());
        return new DownloadedDocument(document.getFileName(), data);
    }

    private GeneratedDocumentDTO toDto(GeneratedDocument document) {
        GeneratedDocumentDTO dto = new GeneratedDocumentDTO();
        dto.setId(document.getId());
        dto.setDocumentType(document.getDocumentType());
        dto.setSourceType(document.getSourceType());
        dto.setSourceId(document.getSourceId());
        dto.setSiteId(document.getSite() == null ? null : document.getSite().getId());
        dto.setFileName(document.getFileName());
        dto.setSha256(document.getSha256());
        dto.setLocale(document.getLocale());
        dto.setTemplateVersion(document.getTemplateVersion());
        dto.setTemplateVersionId(document.getTemplateVersionEntity() == null ? null
                : document.getTemplateVersionEntity().getId());
        dto.setIssuedAt(document.getIssuedAt());
        dto.setIssuedBy(document.getIssuedBy());
        return dto;
    }

    private String sha256(byte[] data) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(data));
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }

    private String createSnapshot(DocumentContextResolver.DocumentContext context, ReportConfig config) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("companyName", context.companyName());
        snapshot.put("legalName", context.legalName());
        snapshot.put("registeredAddress", context.registeredAddress());
        snapshot.put("registrationNumber", context.registrationNumber());
        snapshot.put("taxNumber", context.taxNumber());
        snapshot.put("phone", context.phone());
        snapshot.put("email", context.email());
        snapshot.put("siteId", context.siteId());
        snapshot.put("siteName", context.siteName());
        snapshot.put("locale", context.language().name());
        snapshot.put("timeZone", context.timeZone());
        snapshot.put("currency", context.currency());
        snapshot.put("templateVersion", TEMPLATE_VERSION);
        snapshot.put("reportConfig", config);
        try {
            return SNAPSHOT_MAPPER.writeValueAsString(snapshot);
        } catch (Exception exception) {
            throw new IllegalStateException("Could not snapshot issued document context", exception);
        }
    }

    private String createTemplateSnapshot(DocumentContextResolver.DocumentContext context, JsonNode configuration,
                                          Map<String, Object> values, Long templateId, Long versionId,
                                          int versionNumber) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("companyName", context.companyName());
        snapshot.put("legalName", context.legalName());
        snapshot.put("registeredAddress", context.registeredAddress());
        snapshot.put("registrationNumber", context.registrationNumber());
        snapshot.put("taxNumber", context.taxNumber());
        snapshot.put("phone", context.phone());
        snapshot.put("email", context.email());
        snapshot.put("siteId", context.siteId());
        snapshot.put("siteName", context.siteName());
        snapshot.put("locale", context.language().name());
        snapshot.put("timeZone", context.timeZone());
        snapshot.put("currency", context.currency());
        snapshot.put("templateId", templateId);
        snapshot.put("templateVersionId", versionId);
        snapshot.put("templateVersionNumber", versionNumber);
        snapshot.put("configuration", configuration);
        Map<String, Object> snapshotValues = new LinkedHashMap<>(values);
        if (snapshotValues.containsKey("workOrder.signature")) {
            snapshotValues.put("workOrder.signature", printable(snapshotValues.get("workOrder.signature")).isBlank()
                    ? "NOT_PROVIDED" : "EMBEDDED_IN_ARCHIVED_PDF");
        }
        snapshot.put("fieldValues", snapshotValues);
        try {
            return SNAPSHOT_MAPPER.writeValueAsString(snapshot);
        } catch (Exception exception) {
            throw new IllegalStateException("Could not snapshot issued document template", exception);
        }
    }

    private String printable(Object value) {
        if (value == null) return "";
        if (value instanceof Iterable<?> items) {
            java.util.List<String> strings = new java.util.ArrayList<>();
            items.forEach(item -> strings.add(String.valueOf(item)));
            return String.join(", ", strings);
        }
        if (value instanceof Number || value instanceof Boolean || value instanceof String) return value.toString();
        throw new CustomException("Unsupported report value type", HttpStatus.BAD_REQUEST);
    }

    private boolean isTableField(String field) {
        return "workOrder.executionTasks".equals(field)
                || "workOrder.laborTimeEntries".equals(field)
                || "workOrder.materialsUsed".equals(field);
    }

    private ConfigurableWorkOrderReportRenderer.ReportTable reportTable(
            String key, Map<String, Object> values, java.util.Locale locale, String timeZone, String customTitle) {
        return reportTable(key, values, locale, timeZone, customTitle, null, null);
    }

    private ConfigurableWorkOrderReportRenderer.ReportTable reportTable(
            String key, Map<String, Object> values, java.util.Locale locale, String timeZone, String customTitle,
            List<Integer> columnWidths, List<String> selectedColumns) {
        boolean french = locale != null && "fr".equalsIgnoreCase(locale.getLanguage());
        String title;
        List<String> headers;
        List<String> columns;
        switch (key) {
            case "workOrder.executionTasks" -> {
                title = french ? "Opérations et tâches" : "Operations and tasks";
                headers = french ? List.of("N°", "Opération / tâche", "Résultat", "Notes")
                        : List.of("No.", "Operation / task", "Result", "Notes");
                columns = List.of("step", "task", "result", "notes");
            }
            case "workOrder.laborTimeEntries" -> {
                title = french ? "Temps de main-d’œuvre confirmé" : "Labor time confirmations";
                headers = french ? List.of("Technicien", "Activité", "Début", "Temps", "État")
                        : List.of("Technician", "Activity", "Started", "Time", "Entry status");
                columns = List.of("technician", "activity", "startedAt", "durationSeconds", "status");
            }
            case "workOrder.materialsUsed" -> {
                title = french ? "Pièces et matériels utilisés" : "Materials and parts used";
                headers = french ? List.of("Pièce", "Description", "Quantité", "Unité")
                        : List.of("Part", "Description", "Quantity", "Unit");
                columns = List.of("part", "description", "quantity", "unit");
            }
            default -> throw new CustomException("Unsupported report table", HttpStatus.BAD_REQUEST);
        }
        Object value = values.get(key);
        List<String> visibleColumns = selectedColumns == null ? columns : selectedColumns;
        List<String> visibleHeaders = new java.util.ArrayList<>();
        List<Integer> visibleIndexes = new java.util.ArrayList<>();
        for (String selected : visibleColumns) {
            int index = columns.indexOf(selected);
            if (index < 0) throw new CustomException("Unsupported report table column", HttpStatus.BAD_REQUEST);
            visibleIndexes.add(index);
            visibleHeaders.add(headers.get(index));
        }
        List<List<String>> rows = new java.util.ArrayList<>();
        if (value instanceof Iterable<?> iterable) {
            for (Object item : iterable) {
                if (!(item instanceof Map<?, ?> row)) continue;
                List<String> allCells = new java.util.ArrayList<>();
                for (String column : columns) {
                    Object cell = row.get(column);
                    if ("durationSeconds".equals(column)) allCells.add(formatDuration(cell, row.get("status"), locale));
                    else if ("startedAt".equals(column)) allCells.add(formatDateTime(cell, locale, timeZone));
                    else if ("status".equals(column)) allCells.add(formatLaborStatus(cell, locale));
                    else allCells.add(printableCell(cell));
                }
                List<String> cells = visibleIndexes.stream().map(allCells::get).toList();
                rows.add(cells);
            }
        }
        return new ConfigurableWorkOrderReportRenderer.ReportTable(
                key, customTitle == null ? title : customTitle, visibleHeaders, rows, columnWidths);
    }

    private List<Integer> integerList(JsonNode values) {
        if (values == null || !values.isArray()) return null;
        List<Integer> result = new java.util.ArrayList<>();
        values.forEach(value -> {
            if (value.canConvertToInt()) result.add(value.asInt());
        });
        return result.size() == values.size() ? result : null;
    }

    private List<String> stringList(JsonNode values) {
        if (values == null || !values.isArray()) return null;
        List<String> result = new java.util.ArrayList<>();
        values.forEach(value -> {
            if (value.isTextual()) result.add(value.asText());
        });
        return result.size() == values.size() ? result : null;
    }

    private String customLabel(JsonNode customLabels, String key, String fallback) {
        JsonNode label = customLabels.get(key);
        if (label == null || !label.isTextual() || label.asText().isBlank()) return fallback;
        return label.asText().trim();
    }

    private String printableCell(Object value) {
        if (value == null) return "";
        if (value instanceof Number || value instanceof Boolean || value instanceof String) return value.toString();
        return "";
    }

    private String formatDuration(Object value, Object status, java.util.Locale locale) {
        if (!(value instanceof Number number) || number.longValue() <= 0) return "";
        long seconds = number.longValue();
        long hours = seconds / 3600;
        long minutes = (seconds % 3600) / 60;
        boolean french = locale != null && "fr".equalsIgnoreCase(locale.getLanguage());
        String duration = hours + " h " + minutes + " min";
        return "RUNNING".equals(String.valueOf(status))
                ? duration + (french ? " · En cours" : " · Running") : duration;
    }

    private String formatLaborStatus(Object value, java.util.Locale locale) {
        boolean french = locale != null && "fr".equalsIgnoreCase(locale.getLanguage());
        return switch (String.valueOf(value)) {
            case "RUNNING" -> french ? "En cours" : "Running";
            case "STOPPED" -> french ? "Enregistré" : "Recorded";
            default -> "";
        };
    }

    private String formatDateTime(Object value, java.util.Locale locale, String timeZone) {
        if (!(value instanceof String string) || string.isBlank()) return "";
        try {
            java.time.ZoneId zone;
            try {
                zone = java.time.ZoneId.of(timeZone == null ? "UTC" : timeZone);
            } catch (java.time.DateTimeException ignored) {
                zone = java.time.ZoneOffset.UTC;
            }
            java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern(
                    locale != null && "fr".equalsIgnoreCase(locale.getLanguage())
                            ? "dd/MM/yyyy HH:mm" : "MMM d, yyyy HH:mm",
                    locale == null ? java.util.Locale.ROOT : locale);
            return formatter.format(java.time.Instant.parse(string).atZone(zone));
        } catch (java.time.DateTimeException ignored) {
            return string;
        }
    }

    public record DownloadedDocument(String fileName, byte[] data) { }
}
