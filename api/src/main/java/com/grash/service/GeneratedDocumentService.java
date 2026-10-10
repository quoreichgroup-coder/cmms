package com.grash.service;

import com.grash.dto.GeneratedDocumentDTO;
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
    private final GeneratedDocumentRepository repository;
    private final WorkOrderService workOrderService;
    private final StorageServiceFactory storageServiceFactory;
    private final DocumentContextResolver documentContextResolver;

    @Transactional
    public GeneratedDocumentDTO issueWorkOrderReport(Long workOrderId, ReportConfig config, User user) {
        WorkOrder workOrder = workOrderService.findById(workOrderId)
                .filter(wo -> wo.getCompany().getId().equals(user.getCompany().getId()))
                .orElseThrow(() -> new CustomException("Work order not found", HttpStatus.NOT_FOUND));
        if (!workOrder.canBeViewedBy(user) || !workOrder.canBeEditedBy(user))
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
