package com.grash.service;

import com.grash.dto.GeneratedDocumentDTO;
import com.grash.dto.ReportFieldDefinitionDTO;
import com.grash.dto.ReportConfig;
import com.grash.exception.CustomException;
import com.grash.factory.StorageServiceFactory;
import com.grash.model.GeneratedDocument;
import com.grash.model.Company;
import com.grash.model.User;
import com.grash.model.WorkOrder;
import com.grash.repository.GeneratedDocumentRepository;
import lombok.RequiredArgsConstructor;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.util.Date;
import java.util.HexFormat;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
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
            new ReportFieldDefinitionDTO("workOrder.category", "report.field.workOrder.category", "workOrder", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("asset.name", "report.field.asset.name", "asset", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("location.name", "report.field.location.name", "location", "string", false, false, "locationAddress"),
            new ReportFieldDefinitionDTO("asset.serialNumber", "report.field.asset.serialNumber", "asset", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("workOrder.team", "report.field.workOrder.team", "people", "string", false, false, "workOrderInformation"),
            new ReportFieldDefinitionDTO("workOrder.completedBy", "report.field.workOrder.completedBy", "people", "string", false, false, "workOrderInformation"),
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
            new ReportFieldDefinitionDTO("workOrder.signature", "report.field.workOrder.signature", "execution", "string", false, false, "signature"),
            new ReportFieldDefinitionDTO("workOrder.parts", "report.field.workOrder.parts", "costs", "object", true, true, "cost"),
            new ReportFieldDefinitionDTO("workOrder.labor", "report.field.workOrder.labor", "costs", "object", true, true, "cost"),
            new ReportFieldDefinitionDTO("workOrder.additionalCosts", "report.field.workOrder.additionalCosts", "costs", "object", true, true, "cost"),
            new ReportFieldDefinitionDTO("workOrder.relations", "report.field.workOrder.relations", "relatedRecords", "object", true, false, "relations"),
            new ReportFieldDefinitionDTO("workOrder.files", "report.field.workOrder.files", "attachments", "file", true, false, "files")
    );
    private final GeneratedDocumentRepository repository;
    private final WorkOrderService workOrderService;
    private final StorageServiceFactory storageServiceFactory;
    private final DocumentContextResolver documentContextResolver;

    @Transactional(readOnly = true)
    public List<ReportFieldDefinitionDTO> listWorkOrderReportFields(Long workOrderId, User user) {
        WorkOrder workOrder = workOrderService.findById(workOrderId)
                .orElseThrow(() -> new CustomException("Work order not found", HttpStatus.NOT_FOUND));
        if (!workOrder.getCompany().getId().equals(user.getCompany().getId()))
            throw new CustomException("Work order not found", HttpStatus.NOT_FOUND);
        if (!workOrder.canBeViewedBy(user))
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        return WORK_ORDER_REPORT_FIELDS;
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

    public record DownloadedDocument(String fileName, byte[] data) { }
}
