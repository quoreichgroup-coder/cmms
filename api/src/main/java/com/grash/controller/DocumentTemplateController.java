package com.grash.controller;

import com.grash.dto.DocumentTemplateDTO;
import com.grash.dto.DocumentTemplateRequest;
import com.grash.dto.DocumentTypeRequest;
import com.grash.dto.DocumentTypeDTO;
import com.grash.dto.DocumentTemplateVersionDTO;
import com.grash.model.User;
import com.grash.service.DocumentTemplateService;
import com.grash.service.GeneratedDocumentService;
import com.grash.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/document-templates")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ROLE_CLIENT')")
public class DocumentTemplateController {
    private final DocumentTemplateService service;
    private final GeneratedDocumentService generatedDocumentService;
    private final UserService userService;

    @GetMapping("/types")
    public List<DocumentTypeDTO> listTypes(HttpServletRequest request) {
        return service.listTypes(userService.whoami(request));
    }

    @PostMapping("/types")
    public DocumentTypeDTO createType(@Valid @RequestBody DocumentTypeRequest type,
                                      HttpServletRequest request) {
        return service.createType(type, userService.whoami(request));
    }

    @PutMapping("/types/{id}")
    public DocumentTypeDTO updateType(@PathVariable Long id, @Valid @RequestBody DocumentTypeRequest type,
                                      HttpServletRequest request) {
        return service.updateType(id, type, userService.whoami(request));
    }

    @GetMapping
    public List<DocumentTemplateDTO> list(HttpServletRequest request) {
        return service.list(userService.whoami(request));
    }

    @GetMapping("/{id}/versions")
    public List<DocumentTemplateVersionDTO> listVersions(@PathVariable Long id, HttpServletRequest request) {
        return service.listVersions(id, userService.whoami(request));
    }

    @PostMapping("/{id}/preview-pdf")
    public ResponseEntity<byte[]> previewPdf(@PathVariable Long id, @RequestParam Long workOrderId,
                                             HttpServletRequest request) {
        byte[] pdf = generatedDocumentService.previewDocumentTemplate(id, workOrderId, userService.whoami(request));
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .body(pdf);
    }

    @PostMapping("/{id}/preview-request-pdf")
    public ResponseEntity<byte[]> previewRequestPdf(@PathVariable Long id, @RequestParam Long requestId,
                                                    HttpServletRequest request) {
        byte[] pdf = generatedDocumentService.previewRequestDocumentTemplate(
                id, requestId, userService.whoami(request));
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store").body(pdf);
    }

    @PostMapping("/{id}/preview-data")
    public Map<String, Object> previewData(@PathVariable Long id, @RequestParam Long workOrderId,
                                          HttpServletRequest request) {
        return service.previewData(id, workOrderId, userService.whoami(request));
    }

    @PostMapping
    public DocumentTemplateDTO create(@Valid @RequestBody DocumentTemplateRequest template,
                                      HttpServletRequest request) {
        return service.create(template, userService.whoami(request));
    }

    @PutMapping("/{id}")
    public DocumentTemplateDTO update(@PathVariable Long id, @Valid @RequestBody DocumentTemplateRequest template,
                                      HttpServletRequest request) {
        return service.update(id, template, userService.whoami(request));
    }

    @PostMapping("/{id}/publish")
    public DocumentTemplateDTO publish(@PathVariable Long id, @RequestParam(defaultValue = "false") boolean makeDefault,
                                       HttpServletRequest request) {
        return service.publish(id, makeDefault, userService.whoami(request));
    }

    @PostMapping("/{id}/archive")
    public DocumentTemplateDTO archive(@PathVariable Long id, HttpServletRequest request) {
        return service.archive(id, userService.whoami(request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, HttpServletRequest request) {
        service.delete(id, userService.whoami(request));
        return ResponseEntity.noContent().build();
    }
}
