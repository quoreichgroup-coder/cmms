package com.grash.dto;

/** Describes a server-approved binding available to declarative report templates. */
public record ReportFieldDefinitionDTO(
        String key,
        String labelKey,
        String section,
        String dataType,
        boolean multiple,
        boolean sensitive,
        String reportConfigSection
) { }
