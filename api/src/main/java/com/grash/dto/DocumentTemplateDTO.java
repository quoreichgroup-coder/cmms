package com.grash.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.grash.model.DocumentTemplate;
import com.grash.model.DocumentTemplateVersion;

import java.util.Date;

public record DocumentTemplateDTO(Long id, String code, String name, String description,
                                  String documentTypeCode, String documentTypeName,
                                  String status, boolean isDefault, int draftVersion,
                                  int publishedVersion, JsonNode draftConfiguration, JsonNode publishedConfiguration,
                                  Date updatedAt) {
    public static DocumentTemplateDTO from(DocumentTemplate template) {
        DocumentTemplateVersion draft = template.getDraftVersion();
        DocumentTemplateVersion published = template.getPublishedVersion();
        return new DocumentTemplateDTO(template.getId(), template.getCode(), template.getName(),
                template.getDescription(), template.getDocumentType().getCode(),
                template.getDocumentType().getName(), template.getStatus().name(), template.isDefault(),
                draft == null ? 0 : draft.getVersionNumber(), published == null ? 0 : published.getVersionNumber(),
                draft == null ? null : draft.getConfiguration(),
                published == null ? null : published.getConfiguration(), template.getUpdatedAt());
    }
}
