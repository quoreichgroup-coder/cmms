package com.grash.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.grash.model.DocumentTemplate;
import com.grash.model.DocumentTemplateVersion;

import java.util.Date;

public record DocumentTemplateVersionDTO(Long id, int versionNumber, String status,
                                         Date createdAt, Date publishedAt,
                                         boolean currentDraft, boolean currentPublished,
                                         JsonNode configuration) {
    public static DocumentTemplateVersionDTO from(DocumentTemplateVersion version,
                                                   DocumentTemplate template) {
        return new DocumentTemplateVersionDTO(version.getId(), version.getVersionNumber(),
                version.getStatus().name(), version.getCreatedAt(), version.getPublishedAt(),
                template.getDraftVersion() != null && template.getDraftVersion().getId().equals(version.getId()),
                template.getPublishedVersion() != null
                        && template.getPublishedVersion().getId().equals(version.getId()),
                version.getConfiguration());
    }
}
