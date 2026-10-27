package com.grash.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.grash.exception.CustomException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.stream.StreamSupport;

/** Validates declarative report-template schemas; it never evaluates tenant-provided code. */
@Component
@RequiredArgsConstructor
public class ReportTemplateConfigurationValidator {
    private static final Set<String> ROOT_KEYS = Set.of(
            "schemaVersion", "documentType", "provider", "style", "page", "visibleFields", "fieldLabels", "options", "layout", "design");
    private static final Set<String> PAGE_KEYS = Set.of("size", "orientation", "marginMm");
    private static final Set<String> OPTION_KEYS = Set.of("showPageNumbers", "repeatTableHeader");
    private static final Set<String> PAGE_SIZES = Set.of("A4", "LETTER");
    private static final Set<String> ORIENTATIONS = Set.of("PORTRAIT", "LANDSCAPE");
    private static final Set<String> STYLES = Set.of("CLASSIC", "COMPACT", "MODERN");
    private static final Set<String> SECTION_KEYS = Set.of("id", "type", "title", "columns", "items", "pageBreakBefore", "keepTogether");
    private static final Set<String> COMPONENT_KEYS = Set.of(
            "id", "type", "fieldKey", "label", "title", "style", "hideIfEmpty", "fullWidth", "columnWidths", "tableColumns");
    private static final Set<String> COMPONENT_STYLE_KEYS = Set.of("fontSize", "bold", "alignment", "tone");
    private static final Set<String> DESIGN_KEYS = Set.of("accentColor");
    private static final Set<String> ALIGNMENTS = Set.of("LEFT", "CENTER", "RIGHT");
    private static final Set<String> TONES = Set.of("DEFAULT", "ACCENT");
    private static final Set<String> TABLE_FIELDS = Set.of(
            "workOrder.executionTasks", "workOrder.laborTimeEntries", "workOrder.materialsUsed");
    private static final Map<String, Integer> TABLE_COLUMN_COUNTS = Map.of(
            "workOrder.executionTasks", 4,
            "workOrder.laborTimeEntries", 5,
            "workOrder.materialsUsed", 4);
    private static final Map<String, Set<String>> TABLE_COLUMN_KEYS = Map.of(
            "workOrder.executionTasks", Set.of("step", "task", "result", "notes"),
            "workOrder.laborTimeEntries", Set.of("technician", "activity", "startedAt", "durationSeconds", "status"),
            "workOrder.materialsUsed", Set.of("part", "description", "quantity", "unit"));
    private static final Pattern COMPONENT_ID = Pattern.compile("[A-Za-z0-9_-]{1,64}");
    private final DocumentDataProviderRegistry registry;

    public JsonNode validate(JsonNode configuration, String expectedDocumentType, String expectedProvider) {
        return validate(configuration, expectedDocumentType, expectedProvider, false);
    }

    /**
     * Drafts may contain an empty schema-v2 section so an administrator can start
     * with a genuinely blank canvas. Publication and rendering still use the
     * strict validator above and require at least one data component.
     */
    public JsonNode validateDraft(JsonNode configuration, String expectedDocumentType, String expectedProvider) {
        return validate(configuration, expectedDocumentType, expectedProvider, true);
    }

    private JsonNode validate(JsonNode configuration, String expectedDocumentType, String expectedProvider,
                              boolean allowEmptyLayout) {
        if (configuration == null || !configuration.isObject() || !hasOnly(configuration, ROOT_KEYS)) bad();
        String schemaVersion = text(configuration, "schemaVersion");
        if (!("1.0".equals(schemaVersion) || "2.0".equals(schemaVersion))
                || !expectedDocumentType.equals(text(configuration, "documentType"))
                || !expectedProvider.equals(text(configuration, "provider"))) bad();
        if (!registry.contains(expectedProvider)) bad();
        if (!STYLES.contains(text(configuration, "style"))) bad();
        if (configuration.has("design")) validateDesign(configuration.get("design"));

        JsonNode page = configuration.get("page");
        if (page == null || !page.isObject() || !hasOnly(page, PAGE_KEYS)
                || !PAGE_SIZES.contains(text(page, "size"))
                || !ORIENTATIONS.contains(text(page, "orientation"))) bad();
        JsonNode margin = page.get("marginMm");
        if (margin == null || !margin.canConvertToInt() || margin.asInt() < 5 || margin.asInt() > 30) bad();

        DocumentDataProvider provider = registry.require(expectedProvider);
        Set<String> uniqueFields = "2.0".equals(schemaVersion)
                ? validateLayout(configuration.get("layout"), provider, allowEmptyLayout)
                : validateLegacyFields(configuration.get("visibleFields"), provider);
        JsonNode labels = configuration.get("fieldLabels");
        if (labels != null) {
            if (!labels.isObject() || labels.size() > 32) bad();
            for (var entries = labels.fields(); entries.hasNext();) {
                var entry = entries.next();
                JsonNode label = entry.getValue();
                String value = label != null && label.isTextual() ? label.asText().trim() : "";
                if (!uniqueFields.contains(entry.getKey()) || value.isEmpty() || value.length() > 100
                        || value.chars().anyMatch(Character::isISOControl)) bad();
            }
        }

        JsonNode options = configuration.get("options");
        if (options == null || !options.isObject() || !hasOnly(options, OPTION_KEYS)
                || !booleanField(options, "showPageNumbers")
                || !booleanField(options, "repeatTableHeader")) bad();
        return configuration.deepCopy();
    }

    /** Returns unique allowlisted data bindings in print order for both schema versions. */
    public List<String> visibleFields(JsonNode configuration) {
        List<String> fields = new ArrayList<>();
        if ("2.0".equals(text(configuration, "schemaVersion"))) {
            for (JsonNode section : configuration.path("layout")) {
                for (JsonNode item : section.path("items")) fields.add(text(item, "fieldKey"));
            }
        } else configuration.path("visibleFields").forEach(field -> fields.add(field.asText()));
        return fields;
    }

    public String fieldLabel(JsonNode configuration, String fieldKey, String fallback) {
        if ("2.0".equals(text(configuration, "schemaVersion"))) {
            for (JsonNode section : configuration.path("layout")) for (JsonNode item : section.path("items")) {
                if (fieldKey.equals(text(item, "fieldKey"))) {
                    String label = text(item, "label").trim();
                    if (!label.isEmpty()) return label;
                    String title = text(item, "title").trim();
                    if (!title.isEmpty()) return title;
                }
            }
        }
        JsonNode labels = configuration.path("fieldLabels");
        JsonNode value = labels.get(fieldKey);
        return value != null && value.isTextual() && !value.asText().isBlank() ? value.asText().trim() : fallback;
    }

    private Set<String> validateLegacyFields(JsonNode fields, DocumentDataProvider provider) {
        if (fields == null || !fields.isArray() || fields.isEmpty() || fields.size() > 32) bad();
        Set<String> unique = StreamSupport.stream(fields.spliterator(), false)
                .filter(JsonNode::isTextual).map(JsonNode::asText).collect(java.util.stream.Collectors.toSet());
        if (unique.size() != fields.size() || unique.stream().anyMatch(field -> !provider.supports(field))) bad();
        return unique;
    }

    private Set<String> validateLayout(JsonNode layout, DocumentDataProvider provider, boolean allowEmptyLayout) {
        if (layout == null || !layout.isArray() || layout.isEmpty() || layout.size() > 24) bad();
        Set<String> fields = new HashSet<>();
        Set<String> ids = new HashSet<>();
        int count = 0;
        for (JsonNode section : layout) {
            if (!section.isObject() || !hasOnly(section, SECTION_KEYS) || !"SECTION".equals(text(section, "type"))
                    || !validId(text(section, "id"), ids) || !validText(section, "title", 100)) bad();
            JsonNode columns = section.get("columns");
            if (columns == null || !columns.canConvertToInt() || columns.asInt() < 1 || columns.asInt() > 3) bad();
            if (section.has("pageBreakBefore") && !section.get("pageBreakBefore").isBoolean()) bad();
            if (section.has("keepTogether") && !section.get("keepTogether").isBoolean()) bad();
            JsonNode items = section.get("items");
            if (items == null || !items.isArray() || items.size() > 32) bad();
            if (section.path("keepTogether").asBoolean(false)
                    && StreamSupport.stream(items.spliterator(), false)
                    .anyMatch(item -> "TABLE".equals(item.path("type").asText()))) bad();
            for (JsonNode item : items) {
                if (++count > 32 || !item.isObject() || !hasOnly(item, COMPONENT_KEYS)
                        || !validId(text(item, "id"), ids)) bad();
                String type = text(item, "type");
                String field = text(item, "fieldKey");
                boolean signatureField = "workOrder.signature".equals(field);
                if (!("FIELD".equals(type) || "TABLE".equals(type) || "SIGNATURE".equals(type))
                        || !provider.supports(field)
                        || ("TABLE".equals(type) != TABLE_FIELDS.contains(field))
                        || ("SIGNATURE".equals(type) && !signatureField)
                        || (signatureField && !Set.of("FIELD", "SIGNATURE").contains(type))
                        || !fields.add(field)) bad();
                if (item.has("label") && !validText(item, "label", 100)) bad();
                if (item.has("title") && (!TABLE_FIELDS.contains(field) || !validText(item, "title", 100))) bad();
                if (item.has("hideIfEmpty") && (!item.get("hideIfEmpty").isBoolean() || "TABLE".equals(type))) bad();
                if (item.has("fullWidth") && (!item.get("fullWidth").isBoolean() || !"FIELD".equals(type))) bad();
                if (item.has("tableColumns") && (!"TABLE".equals(type)
                        || !validTableColumns(item.get("tableColumns"), TABLE_COLUMN_KEYS.get(field)))) bad();
                int expectedTableColumns = item.has("tableColumns")
                        ? item.path("tableColumns").size() : TABLE_COLUMN_COUNTS.getOrDefault(field, 0);
                if (item.has("columnWidths") && (!"TABLE".equals(type)
                        || !validColumnWidths(item.get("columnWidths"), expectedTableColumns))) bad();
                if (item.has("style")) validateComponentStyle(item.get("style"));
            }
        }
        if (count == 0 && !allowEmptyLayout) bad();
        return fields;
    }

    private boolean validColumnWidths(JsonNode widths, Integer expectedCount) {
        if (expectedCount == null || !widths.isArray() || widths.size() != expectedCount) return false;
        if (expectedCount == 0) return false;
        int total = 0;
        for (JsonNode width : widths) {
            int max = expectedCount == 1 ? 100 : 70;
            if (!width.isIntegralNumber() || width.asInt() < 10 || width.asInt() > max) return false;
            total += width.asInt();
        }
        return total == 100;
    }

    private boolean validTableColumns(JsonNode columns, Set<String> allowed) {
        if (allowed == null || !columns.isArray() || columns.isEmpty() || columns.size() > allowed.size()) return false;
        Set<String> selected = new HashSet<>();
        for (JsonNode column : columns) {
            if (!column.isTextual() || !allowed.contains(column.asText()) || !selected.add(column.asText())) return false;
        }
        return true;
    }

    private boolean validId(String id, Set<String> ids) {
        return COMPONENT_ID.matcher(id).matches() && ids.add(id);
    }

    private boolean validText(JsonNode node, String key, int maxLength) {
        JsonNode value = node.get(key);
        return value != null && value.isTextual() && !value.asText().isBlank()
                && value.asText().trim().length() <= maxLength
                && value.asText().chars().noneMatch(Character::isISOControl);
    }

    private void validateComponentStyle(JsonNode style) {
        if (!style.isObject() || !hasOnly(style, COMPONENT_STYLE_KEYS)) bad();
        if (style.has("fontSize") && (!style.get("fontSize").canConvertToInt()
                || style.get("fontSize").asInt() < 7 || style.get("fontSize").asInt() > 16)) bad();
        if (style.has("bold") && !style.get("bold").isBoolean()) bad();
        if (style.has("alignment") && (!style.get("alignment").isTextual()
                || !ALIGNMENTS.contains(style.get("alignment").asText()))) bad();
        if (style.has("tone") && (!style.get("tone").isTextual()
                || !TONES.contains(style.get("tone").asText()))) bad();
    }

    private void validateDesign(JsonNode design) {
        if (design == null || !design.isObject() || !hasOnly(design, DESIGN_KEYS)) bad();
        if (!design.has("accentColor")) return;
        String color = text(design, "accentColor");
        if (!color.matches("#[0-9A-Fa-f]{6}") || contrastRatioAgainstWhite(color) < 4.5) bad();
    }

    private double contrastRatioAgainstWhite(String hex) {
        int red = Integer.parseInt(hex.substring(1, 3), 16);
        int green = Integer.parseInt(hex.substring(3, 5), 16);
        int blue = Integer.parseInt(hex.substring(5, 7), 16);
        double luminance = 0.2126 * linearize(red) + 0.7152 * linearize(green) + 0.0722 * linearize(blue);
        return 1.05 / (luminance + 0.05);
    }

    private double linearize(int channel) {
        double value = channel / 255.0;
        return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    }

    private boolean hasOnly(JsonNode object, Set<String> keys) {
        for (var names = object.fieldNames(); names.hasNext();) if (!keys.contains(names.next())) return false;
        return true;
    }

    private String text(JsonNode node, String key) {
        JsonNode value = node.get(key);
        return value != null && value.isTextual() ? value.asText() : "";
    }

    private boolean booleanField(JsonNode node, String key) {
        JsonNode value = node.get(key);
        return value != null && value.isBoolean();
    }

    private void bad() {
        throw new CustomException("Invalid or unsupported report template configuration", HttpStatus.BAD_REQUEST);
    }
}
