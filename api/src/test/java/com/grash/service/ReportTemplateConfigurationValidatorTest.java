package com.grash.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.grash.exception.CustomException;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class ReportTemplateConfigurationValidatorTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private final DocumentDataProvider provider = new DocumentDataProvider() {
        @Override public String providerCode() { return "WORK_ORDER"; }
        @Override public boolean supports(String key) { return Set.of("workOrder.title", "asset.name").contains(key); }
        @Override public Map<String, Object> resolve(Object source, DocumentContextResolver.DocumentContext context,
                                                     Set<String> fields) { return Map.of(); }
    };
    private final ReportTemplateConfigurationValidator validator = new ReportTemplateConfigurationValidator(
            new DocumentDataProviderRegistry(java.util.List.of(provider)));

    @Test
    void acceptsOnlySupportedDeclarativeConfiguration() throws Exception {
        var config = mapper.readTree("""
                {"schemaVersion":"1.0","documentType":"WORK_ORDER","provider":"WORK_ORDER",
                 "style":"CLASSIC","page":{"size":"A4","orientation":"LANDSCAPE","marginMm":10},
                 "visibleFields":["workOrder.title","asset.name"],
                 "options":{"showPageNumbers":true,"repeatTableHeader":true}}
                """);

        assertEquals(config, validator.validate(config, "WORK_ORDER", "WORK_ORDER"));
    }

    @Test
    void rejectsUnknownOrExecutableProperties() throws Exception {
        var config = mapper.readTree("""
                {"schemaVersion":"1.0","documentType":"WORK_ORDER","provider":"WORK_ORDER",
                 "style":"CLASSIC","script":"alert(1)",
                 "page":{"size":"A4","orientation":"LANDSCAPE","marginMm":10},
                 "visibleFields":["workOrder.title"],
                 "options":{"showPageNumbers":true,"repeatTableHeader":true}}
                """);

        assertThrows(CustomException.class, () -> validator.validate(config, "WORK_ORDER", "WORK_ORDER"));
    }

    @Test
    void rejectsUnsupportedBindingsAndProviderMismatch() throws Exception {
        var config = mapper.readTree("""
                {"schemaVersion":"1.0","documentType":"WORK_ORDER","provider":"WORK_ORDER",
                 "style":"CLASSIC","page":{"size":"A4","orientation":"LANDSCAPE","marginMm":10},
                 "visibleFields":["workOrder.cost"],
                 "options":{"showPageNumbers":true,"repeatTableHeader":true}}
                """);

        assertThrows(CustomException.class, () -> validator.validate(config, "WORK_ORDER", "WORK_ORDER"));
        assertThrows(CustomException.class, () -> validator.validate(config, "WORK_ORDER", "UNKNOWN"));
    }
}
