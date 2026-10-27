package com.grash.dto;

/** Minimal information exposed to users who can view a source work order. */
public record PublishedReportTemplateOptionDTO(Long id, String name, int versionNumber, boolean isDefault,
                                               String defaultScope, String siteName) {
    public PublishedReportTemplateOptionDTO(Long id, String name, int versionNumber, boolean isDefault) {
        this(id, name, versionNumber, isDefault, "COMPANY", null);
    }
}
