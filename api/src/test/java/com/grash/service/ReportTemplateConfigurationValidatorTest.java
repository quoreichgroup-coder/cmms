package com.grash.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.grash.exception.CustomException;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class ReportTemplateConfigurationValidatorTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private final DocumentDataProvider provider = new DocumentDataProvider() {
        @Override public String providerCode() { return "WORK_ORDER"; }
        @Override public boolean supports(String key) { return Set.of("workOrder.title", "asset.name", "workOrder.signature",
                "workOrder.executionTasks", "workOrder.laborTimeEntries", "workOrder.materialsUsed").contains(key); }
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

    @Test
    void acceptsCustomLabelsOnlyForVisibleAllowlistedFields() throws Exception {
        var config = mapper.readTree("""
                {"schemaVersion":"1.0","documentType":"WORK_ORDER","provider":"WORK_ORDER",
                 "style":"CLASSIC","page":{"size":"A4","orientation":"LANDSCAPE","marginMm":10},
                 "visibleFields":["workOrder.title"],"fieldLabels":{"workOrder.title":"Inspection summary"},
                 "options":{"showPageNumbers":true,"repeatTableHeader":true}}
                """);
        assertEquals(config, validator.validate(config, "WORK_ORDER", "WORK_ORDER"));

        var unrelated = mapper.readTree("""
                {"schemaVersion":"1.0","documentType":"WORK_ORDER","provider":"WORK_ORDER",
                 "style":"CLASSIC","page":{"size":"A4","orientation":"LANDSCAPE","marginMm":10},
                 "visibleFields":["workOrder.title"],"fieldLabels":{"asset.name":"Equipment"},
                 "options":{"showPageNumbers":true,"repeatTableHeader":true}}
                """);
        assertThrows(CustomException.class, () -> validator.validate(unrelated, "WORK_ORDER", "WORK_ORDER"));
    }

    @Test
    void rejectsBlankOversizedOrNonTextCustomLabels() throws Exception {
        for (String labelJson : List.of("\" \"", "\"" + "x".repeat(101) + "\"", "12")) {
            var config = mapper.readTree("""
                    {"schemaVersion":"1.0","documentType":"WORK_ORDER","provider":"WORK_ORDER",
                     "style":"CLASSIC","page":{"size":"A4","orientation":"LANDSCAPE","marginMm":10},
                     "visibleFields":["workOrder.title"],"fieldLabels":{"workOrder.title":%s},
                     "options":{"showPageNumbers":true,"repeatTableHeader":true}}
                    """.formatted(labelJson));
            assertThrows(CustomException.class, () -> validator.validate(config, "WORK_ORDER", "WORK_ORDER"));
        }
    }

    @Test
    void acceptsStructuredTwoColumnLayoutAndPreservesBindingOrder() throws Exception {
        var config = mapper.readTree("""
                {"schemaVersion":"2.0","documentType":"WORK_ORDER","provider":"WORK_ORDER",
                 "style":"MODERN","page":{"size":"A4","orientation":"LANDSCAPE","marginMm":10},
                 "design":{"accentColor":"#2F5BEA"},
                 "layout":[{"id":"equipment","type":"SECTION","title":"Equipment details","columns":2,
                   "pageBreakBefore":true,
                   "items":[{"id":"equipment-name","type":"FIELD","fieldKey":"asset.name","label":"Asset",
                             "hideIfEmpty":true,"fullWidth":true},
                            {"id":"wo-title","type":"FIELD","fieldKey":"workOrder.title"}]}],
                 "options":{"showPageNumbers":true,"repeatTableHeader":true}}
                """);
        assertEquals(config, validator.validate(config, "WORK_ORDER", "WORK_ORDER"));
        assertEquals(List.of("asset.name", "workOrder.title"), validator.visibleFields(config));
        assertEquals("Asset", validator.fieldLabel(config, "asset.name", "Equipment"));

        var invalidPageBreak = config.deepCopy();
        ((com.fasterxml.jackson.databind.node.ObjectNode) invalidPageBreak.path("layout").get(0))
                .put("pageBreakBefore", "yes");
        assertThrows(CustomException.class,
                () -> validator.validate(invalidPageBreak, "WORK_ORDER", "WORK_ORDER"));

        var invalidEmptyRule = config.deepCopy();
        ((com.fasterxml.jackson.databind.node.ObjectNode) invalidEmptyRule.at("/layout/0/items/0"))
                .put("hideIfEmpty", "sometimes");
        assertThrows(CustomException.class,
                () -> validator.validate(invalidEmptyRule, "WORK_ORDER", "WORK_ORDER"));

        var invalidWidthRule = config.deepCopy();
        ((com.fasterxml.jackson.databind.node.ObjectNode) invalidWidthRule.at("/layout/0/items/0"))
                .put("fullWidth", "wide");
        assertThrows(CustomException.class,
                () -> validator.validate(invalidWidthRule, "WORK_ORDER", "WORK_ORDER"));
    }

    @Test
    void validatesConfigurableTableColumnWidths() throws Exception {
        var valid = mapper.readTree("""
                {"schemaVersion":"2.0","documentType":"WORK_ORDER","provider":"WORK_ORDER",
                 "style":"MODERN","page":{"size":"A4","orientation":"LANDSCAPE","marginMm":10},
                 "layout":[{"id":"operations","type":"SECTION","title":"Operations","columns":1,
                   "items":[{"id":"tasks","type":"TABLE","fieldKey":"workOrder.executionTasks",
                             "tableColumns":["step","task","result","notes"],
                             "columnWidths":[10,38,18,34]}]}],
                 "options":{"showPageNumbers":true,"repeatTableHeader":true}}
                """);
        assertEquals(valid, validator.validate(valid, "WORK_ORDER", "WORK_ORDER"));

        for (String widths : List.of("[10,38,18]", "[10,38,18,33]", "[5,45,20,30]", "[10,10,9,71]", "[10,38,18,\"34\"]")) {
            var invalid = valid.deepCopy();
            ((com.fasterxml.jackson.databind.node.ObjectNode) invalid.at("/layout/0/items/0"))
                    .set("columnWidths", mapper.readTree(widths));
            assertThrows(CustomException.class, () -> validator.validate(invalid, "WORK_ORDER", "WORK_ORDER"),
                    "invalid widths should be rejected: " + widths);
        }

        var wrongComponent = valid.deepCopy();
        ((com.fasterxml.jackson.databind.node.ObjectNode) wrongComponent.at("/layout/0/items/0"))
                .put("type", "FIELD");
        assertThrows(CustomException.class, () -> validator.validate(wrongComponent, "WORK_ORDER", "WORK_ORDER"));

        var selected = valid.deepCopy();
        var selectedItem = (com.fasterxml.jackson.databind.node.ObjectNode) selected.at("/layout/0/items/0");
        selectedItem.set("tableColumns", mapper.readTree("[\"notes\",\"task\"]"));
        selectedItem.set("columnWidths", mapper.readTree("[35,65]"));
        assertEquals(selected, validator.validate(selected, "WORK_ORDER", "WORK_ORDER"));

        for (String columns : List.of("[]", "[\"notes\",\"notes\"]", "[\"unknown\"]", "[1]")) {
            var invalid = selected.deepCopy();
            ((com.fasterxml.jackson.databind.node.ObjectNode) invalid.at("/layout/0/items/0"))
                    .set("tableColumns", mapper.readTree(columns));
            assertThrows(CustomException.class, () -> validator.validate(invalid, "WORK_ORDER", "WORK_ORDER"),
                    "invalid table columns should be rejected: " + columns);
        }
    }

    @Test
    void allowsAnEmptyVersionTwoLayoutOnlyForDraftSaving() throws Exception {
        var blankDraft = mapper.readTree("""
                {"schemaVersion":"2.0","documentType":"WORK_ORDER","provider":"WORK_ORDER",
                 "style":"CLASSIC","page":{"size":"A4","orientation":"LANDSCAPE","marginMm":10},
                 "layout":[{"id":"main","type":"SECTION","title":"Work Order","columns":2,"items":[]}],
                 "options":{"showPageNumbers":true,"repeatTableHeader":true}}
                """);

        assertEquals(blankDraft, validator.validateDraft(blankDraft, "WORK_ORDER", "WORK_ORDER"));
        assertThrows(CustomException.class, () -> validator.validate(blankDraft, "WORK_ORDER", "WORK_ORDER"),
                "rendering and publishing must require at least one component");
    }

    @Test
    void rejectsUnrecognizedPropertiesAndDuplicatedStructuredComponents() throws Exception {
        var unrecognized = mapper.readTree("""
                {"schemaVersion":"2.0","documentType":"WORK_ORDER","provider":"WORK_ORDER",
                 "style":"CLASSIC","page":{"size":"A4","orientation":"PORTRAIT","marginMm":10},
                 "layout":[{"id":"section","type":"SECTION","title":"<script>alert(1)</script>","columns":2,
                   "items":[{"id":"field","type":"FIELD","fieldKey":"workOrder.title","script":"alert(1)"}]}],
                 "options":{"showPageNumbers":true,"repeatTableHeader":true}}
                """);
        var duplicate = mapper.readTree("""
                {"schemaVersion":"2.0","documentType":"WORK_ORDER","provider":"WORK_ORDER",
                 "style":"CLASSIC","page":{"size":"A4","orientation":"PORTRAIT","marginMm":10},
                 "layout":[{"id":"section","type":"SECTION","title":"Work","columns":2,
                   "items":[{"id":"field","type":"FIELD","fieldKey":"workOrder.title"},
                            {"id":"field","type":"FIELD","fieldKey":"asset.name"}]}],
                 "options":{"showPageNumbers":true,"repeatTableHeader":true}}
                """);
        assertThrows(CustomException.class, () -> validator.validate(unrecognized, "WORK_ORDER", "WORK_ORDER"));
        assertThrows(CustomException.class, () -> validator.validate(duplicate, "WORK_ORDER", "WORK_ORDER"));
    }

    @Test
    void acceptsAnExplicitSignatureBlockOnlyForTheTechnicianSignatureBinding() throws Exception {
        var valid = mapper.readTree("""
                {"schemaVersion":"2.0","documentType":"WORK_ORDER","provider":"WORK_ORDER",
                 "style":"CLASSIC","page":{"size":"A4","orientation":"PORTRAIT","marginMm":10},
                 "layout":[{"id":"signoff","type":"SECTION","title":"Sign-off","columns":1,
                   "items":[{"id":"signature","type":"SIGNATURE","fieldKey":"workOrder.signature","label":"Technician"}]}],
                 "options":{"showPageNumbers":true,"repeatTableHeader":true}}
                """);
        assertEquals(valid, validator.validate(valid, "WORK_ORDER", "WORK_ORDER"));

        var compatibleDraft = valid.deepCopy();
        ((com.fasterxml.jackson.databind.node.ObjectNode) compatibleDraft.at("/layout/0/items/0"))
                .put("type", "FIELD");
        assertEquals(compatibleDraft, validator.validate(compatibleDraft, "WORK_ORDER", "WORK_ORDER"),
                "existing V2 drafts that stored the signature as a field remain readable");

        var invalid = valid.deepCopy();
        ((com.fasterxml.jackson.databind.node.ObjectNode) invalid.at("/layout/0/items/0"))
                .put("fieldKey", "workOrder.title");
        assertThrows(CustomException.class, () -> validator.validate(invalid, "WORK_ORDER", "WORK_ORDER"));
    }

    @Test
    void acceptsOnlyHighContrastSixDigitTemplateAccentColors() throws Exception {
        var lowContrast = mapper.readTree("""
                {"schemaVersion":"1.0","documentType":"WORK_ORDER","provider":"WORK_ORDER",
                 "style":"CLASSIC","page":{"size":"A4","orientation":"PORTRAIT","marginMm":10},
                 "visibleFields":["workOrder.title"],"design":{"accentColor":"#EEEEEE"},
                 "options":{"showPageNumbers":true,"repeatTableHeader":true}}
                """);
        var malformed = lowContrast.deepCopy();
        ((com.fasterxml.jackson.databind.node.ObjectNode) malformed.path("design")).put("accentColor", "red;display:none");
        assertThrows(CustomException.class, () -> validator.validate(lowContrast, "WORK_ORDER", "WORK_ORDER"));
        assertThrows(CustomException.class, () -> validator.validate(malformed, "WORK_ORDER", "WORK_ORDER"));
    }
}
