package com.grash.controller;

import com.grash.dto.GeneratedDocumentDTO;
import com.grash.dto.ReportConfig;
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

@RestController
@RequiredArgsConstructor
public class GeneratedDocumentController {
    private final GeneratedDocumentService generatedDocumentService;
    private final UserService userService;

    @PostMapping("/work-orders/{workOrderId}/report/issue")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public GeneratedDocumentDTO issueWorkOrderReport(@PathVariable Long workOrderId,
                                                      @Valid @RequestBody ReportConfig config,
                                                      HttpServletRequest request) {
        User user = userService.whoami(request);
        return generatedDocumentService.issueWorkOrderReport(workOrderId, config, user);
    }

    @GetMapping("/work-orders/{workOrderId}/documents")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public List<GeneratedDocumentDTO> listWorkOrderReports(@PathVariable Long workOrderId,
                                                           HttpServletRequest request) {
        User user = userService.whoami(request);
        return generatedDocumentService.listWorkOrderReports(workOrderId, user);
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
