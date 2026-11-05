package com.grash.controller;

import com.grash.dto.GeneratedDocumentDTO;
import com.grash.dto.GeneratedDocumentAccessPageDTO;
import com.grash.dto.ReportFieldDefinitionDTO;
import com.grash.dto.ReportPreviewRequest;
import com.grash.dto.ReportTablePreviewRequest;
import com.grash.dto.ReportTablePreviewDTO;
import com.grash.dto.ReportConfig;
import com.grash.dto.PublishedReportTemplateOptionDTO;
import com.grash.model.User;
import com.grash.model.enums.PermissionEntity;
import com.grash.service.GeneratedDocumentService;
import com.grash.service.GeneratedDocumentAccessEventService;
import com.grash.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.HttpStatus;
import com.grash.exception.CustomException;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class GeneratedDocumentController {
    private final GeneratedDocumentService generatedDocumentService;
    private final GeneratedDocumentAccessEventService accessEventService;
    private final UserService userService;

    @GetMapping("/settings/generated-document-access")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public GeneratedDocumentAccessPageDTO documentAccessHistory(
            @RequestParam(defaultValue = "") String query,
            @RequestParam(defaultValue = "") String sourceType,
            @RequestParam(defaultValue = "") String outcome,
            @RequestParam(required = false) Long sourceId,
            @RequestParam(defaultValue = "0") int page,
            HttpServletRequest request) {
        User user = userService.whoami(request);
        if (user.getRole() == null || !user.getRole().getViewPermissions().contains(PermissionEntity.SETTINGS))
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        return accessEventService.search(user, query, sourceType, outcome, sourceId, page);
    }

    @GetMapping("/work-orders/{workOrderId}/report/fields")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public List<ReportFieldDefinitionDTO> listWorkOrderReportFields(@PathVariable Long workOrderId,
                                                                     HttpServletRequest request) {
        User user = userService.whoami(request);
        return generatedDocumentService.listWorkOrderReportFields(workOrderId, user);
    }

    @PostMapping("/work-orders/{workOrderId}/report/preview-data")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public Map<String, Object> previewWorkOrderReportData(@PathVariable Long workOrderId,
                                                           @Valid @RequestBody ReportPreviewRequest requestBody,
                                                           HttpServletRequest request) {
        User user = userService.whoami(request);
        return generatedDocumentService.previewWorkOrderReportData(
                workOrderId, List.copyOf(requestBody.fields()), user);
    }

    @PostMapping("/work-orders/{workOrderId}/report/diagnose-data")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public Map<String, com.grash.dto.ReportFieldDiagnosisDTO> diagnoseWorkOrderReportData(
            @PathVariable Long workOrderId, @Valid @RequestBody ReportPreviewRequest requestBody,
            HttpServletRequest request) {
        User user = userService.whoami(request);
        return generatedDocumentService.diagnoseWorkOrderReportData(
                workOrderId, List.copyOf(requestBody.fields()), user);
    }

    @PostMapping("/work-orders/{workOrderId}/report/table-preview")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public ReportTablePreviewDTO previewWorkOrderReportTable(@PathVariable Long workOrderId,
            @Valid @RequestBody ReportTablePreviewRequest requestBody, HttpServletRequest request) {
        User user = userService.whoami(request);
        return generatedDocumentService.previewWorkOrderReportTable(workOrderId,
                requestBody.binding(), List.copyOf(requestBody.columns()), user);
    }

    @GetMapping("/requests/{requestId}/report/fields")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public List<ReportFieldDefinitionDTO> listRequestReportFields(@PathVariable Long requestId,
                                                                  HttpServletRequest request) {
        User user = userService.whoami(request);
        return generatedDocumentService.listRequestReportFields(requestId, user);
    }

    @PostMapping("/requests/{requestId}/report/preview-data")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public Map<String, Object> previewRequestReportData(@PathVariable Long requestId,
                                                         @Valid @RequestBody ReportPreviewRequest requestBody,
                                                         HttpServletRequest request) {
        User user = userService.whoami(request);
        return generatedDocumentService.previewRequestReportData(
                requestId, List.copyOf(requestBody.fields()), user);
    }

    @GetMapping("/requests/{requestId}/report/templates")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public List<PublishedReportTemplateOptionDTO> listPublishedRequestReportTemplates(
            @PathVariable Long requestId, HttpServletRequest request) {
        User user = userService.whoami(request);
        return generatedDocumentService.listPublishedRequestReportTemplates(requestId, user);
    }

    @PostMapping("/requests/{requestId}/report/preview-template/{templateId}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public ResponseEntity<byte[]> previewRequestReportFromTemplate(@PathVariable Long requestId,
                                                                    @PathVariable Long templateId,
                                                                    HttpServletRequest request) {
        User user = userService.whoami(request);
        byte[] pdf = generatedDocumentService.previewRequestReportFromTemplate(requestId, templateId, user);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .header("X-Content-Type-Options", "nosniff").body(pdf);
    }

    @PostMapping("/requests/{requestId}/report/issue-template/{templateId}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public GeneratedDocumentDTO issueRequestReportFromTemplate(@PathVariable Long requestId,
                                                                @PathVariable Long templateId,
                                                                HttpServletRequest request) {
        User user = userService.whoami(request);
        return generatedDocumentService.issueRequestReportFromTemplate(requestId, templateId, user);
    }

    @GetMapping("/work-orders/{workOrderId}/report/templates")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public List<PublishedReportTemplateOptionDTO> listPublishedWorkOrderReportTemplates(
            @PathVariable Long workOrderId, HttpServletRequest request) {
        User user = userService.whoami(request);
        return generatedDocumentService.listPublishedWorkOrderReportTemplates(workOrderId, user);
    }

    @PostMapping("/work-orders/{workOrderId}/report/issue")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public GeneratedDocumentDTO issueWorkOrderReport(@PathVariable Long workOrderId,
                                                      @Valid @RequestBody ReportConfig config,
                                                      HttpServletRequest request) {
        User user = userService.whoami(request);
        return generatedDocumentService.issueWorkOrderReport(workOrderId, config, user);
    }

    @PostMapping("/work-orders/{workOrderId}/report/issue-template/{templateId}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public GeneratedDocumentDTO issueWorkOrderReportFromTemplate(@PathVariable Long workOrderId,
                                                                  @PathVariable Long templateId,
                                                                  HttpServletRequest request) {
        User user = userService.whoami(request);
        return generatedDocumentService.issueWorkOrderReportFromTemplate(workOrderId, templateId, user);
    }

    @PostMapping("/work-orders/{workOrderId}/report/preview-template/{templateId}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public ResponseEntity<byte[]> previewWorkOrderReportFromTemplate(@PathVariable Long workOrderId,
                                                                      @PathVariable Long templateId,
                                                                      HttpServletRequest request) {
        User user = userService.whoami(request);
        byte[] pdf = generatedDocumentService.previewWorkOrderReportFromTemplate(workOrderId, templateId, user);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .header("X-Content-Type-Options", "nosniff")
                .body(pdf);
    }

    @GetMapping("/work-orders/{workOrderId}/documents")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public List<GeneratedDocumentDTO> listWorkOrderReports(@PathVariable Long workOrderId,
                                                           HttpServletRequest request) {
        User user = userService.whoami(request);
        return generatedDocumentService.listWorkOrderReports(workOrderId, user);
    }

    @GetMapping("/requests/{requestId}/documents")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public List<GeneratedDocumentDTO> listRequestReports(@PathVariable Long requestId,
                                                          HttpServletRequest request) {
        User user = userService.whoami(request);
        return generatedDocumentService.listRequestReports(requestId, user);
    }

    @GetMapping("/purchase-orders/{id}/document-templates")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public List<PublishedReportTemplateOptionDTO> listPurchaseOrderTemplates(@PathVariable Long id, HttpServletRequest request) {
        return generatedDocumentService.listPublishedPurchaseOrderTemplates(id, userService.whoami(request));
    }

    @PostMapping("/purchase-orders/{id}/documents/preview/{templateId}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public ResponseEntity<byte[]> previewPurchaseOrder(@PathVariable Long id, @PathVariable Long templateId, HttpServletRequest request) {
        return pdf(generatedDocumentService.previewPurchaseOrder(id, templateId, userService.whoami(request)));
    }

    @PostMapping("/purchase-orders/{id}/documents/issue/{templateId}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public GeneratedDocumentDTO issuePurchaseOrder(@PathVariable Long id, @PathVariable Long templateId, HttpServletRequest request) {
        return generatedDocumentService.issuePurchaseOrder(id, templateId, userService.whoami(request));
    }

    @GetMapping("/purchase-orders/{id}/documents")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public List<GeneratedDocumentDTO> listPurchaseOrderDocuments(@PathVariable Long id, HttpServletRequest request) {
        return generatedDocumentService.listPurchaseOrderDocuments(id, userService.whoami(request));
    }

    @GetMapping("/purchase-requisitions/{id}/document-templates")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public List<PublishedReportTemplateOptionDTO> listPurchaseRequisitionTemplates(@PathVariable Long id, HttpServletRequest request) {
        return generatedDocumentService.listPublishedPurchaseRequisitionTemplates(id, userService.whoami(request));
    }

    @PostMapping("/purchase-requisitions/{id}/documents/preview/{templateId}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public ResponseEntity<byte[]> previewPurchaseRequisition(@PathVariable Long id, @PathVariable Long templateId, HttpServletRequest request) {
        return pdf(generatedDocumentService.previewPurchaseRequisition(id, templateId, userService.whoami(request)));
    }

    @PostMapping("/purchase-requisitions/{id}/documents/issue/{templateId}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public GeneratedDocumentDTO issuePurchaseRequisition(@PathVariable Long id, @PathVariable Long templateId, HttpServletRequest request) {
        return generatedDocumentService.issuePurchaseRequisition(id, templateId, userService.whoami(request));
    }

    @GetMapping("/purchase-requisitions/{id}/documents")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public List<GeneratedDocumentDTO> listPurchaseRequisitionDocuments(@PathVariable Long id, HttpServletRequest request) {
        return generatedDocumentService.listPurchaseRequisitionDocuments(id, userService.whoami(request));
    }

    private ResponseEntity<byte[]> pdf(byte[] bytes) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .header("X-Content-Type-Options", "nosniff").body(bytes);
    }

    @GetMapping("/documents/{id}/download")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public ResponseEntity<byte[]> download(@PathVariable Long id, HttpServletRequest request) {
        User user = userService.whoami(request);
        GeneratedDocumentService.DownloadedDocument document = generatedDocumentService.download(id, user);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + document.fileName().replace("\"", "") + "\"")
                .body(document.data());
    }
}
