package com.grash.controller;

import com.grash.dto.GeneratedDocumentDTO;
import com.grash.dto.ReportFieldDefinitionDTO;
import com.grash.dto.ReportPreviewRequest;
import com.grash.dto.ReportTablePreviewRequest;
import com.grash.dto.ReportTablePreviewDTO;
import com.grash.dto.ReportConfig;
import com.grash.dto.PublishedReportTemplateOptionDTO;
import com.grash.model.User;
import com.grash.service.GeneratedDocumentService;
import com.grash.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class GeneratedDocumentController {
    private final GeneratedDocumentService generatedDocumentService;
    private final UserService userService;

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
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store").body(pdf);
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

    @GetMapping("/documents/{id}/download")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public ResponseEntity<byte[]> download(@PathVariable Long id, HttpServletRequest request) {
        User user = userService.whoami(request);
        GeneratedDocumentService.DownloadedDocument document = generatedDocumentService.download(id, user);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + document.fileName().replace("\"", "") + "\"")
                .body(document.data());
    }
}
