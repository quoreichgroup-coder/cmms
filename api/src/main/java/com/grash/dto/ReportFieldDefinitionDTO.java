package com.grash.dto;

/** Describes a server-approved binding available to declarative report templates. */
public record ReportFieldDefinitionDTO(
        String key,
        String labelKey,
        String section,
        String dataType,
        boolean multiple,
        boolean sensitive,
        String reportConfigSection,
        boolean valueSupported
) {
    public ReportFieldDefinitionDTO(String key, String labelKey, String section, String dataType,
                                    boolean multiple, boolean sensitive, String reportConfigSection) {
        this(key, labelKey, section, dataType, multiple, sensitive, reportConfigSection, false);
    }

    public ReportFieldDefinitionDTO withValueSupport(boolean supported) {
        return new ReportFieldDefinitionDTO(key, labelKey, section, dataType, multiple, sensitive,
                reportConfigSection, supported);
    }
}
