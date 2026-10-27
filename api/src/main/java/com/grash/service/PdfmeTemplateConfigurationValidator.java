package com.grash.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.grash.exception.CustomException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Base64;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/** Validates the supported, declarative subset of pdfme templates for Work Orders. */
@Component
@RequiredArgsConstructor
public class PdfmeTemplateConfigurationValidator {
    private static final String SUPPORTED_PDFME_VERSION = "6.2.8";
    private static final Set<String> ROOT_KEYS = Set.of("basePdf", "schemas", "pdfmeVersion", "font", "qpmPrintZoneHeights");
    private static final Set<String> BASE_PDF_KEYS = Set.of("width", "height", "padding");
    private static final Set<String> TYPES = Set.of(
            "text", "multiVariableText", "image", "signature", "table", "line", "rectangle", "ellipse", "qrcode");
    private static final Set<String> TABLE_FIELDS = Set.of(
            "workOrder.executionTasks", "workOrder.laborTimeEntries", "workOrder.materialsUsed");
    private static final Set<String> COMPONENTS = Set.of(
            "summary", "people", "tasks", "labor", "materials", "signoff", "comments", "history",
            "relations", "customFields", "attachments");
    private static final Set<String> SCHEMA_KEYS = Set.of(
            "name", "type", "position", "width", "height", "rotate", "opacity", "required", "readOnly",
            "content", "fontName", "fontSize", "fontColor", "alignment", "verticalAlignment", "lineHeight",
            "characterSpacing", "backgroundColor", "borderColor", "borderWidth", "padding", "underline",
            "strikethrough", "dynamicFontSize", "overflow", "format", "showHead", "head", "headWidthPercentages",
            "repeatHead", "tableStyles", "headStyles", "bodyStyles", "columnStyles", "fit", "objectFit", "objectPosition",
            "color", "barColor", "textFormat", "fontVariantFallback", "radius", "columnBindings", "qpmComponent", "qpmSectionId", "qpmHideComponentIfEmpty", "qpmPrintZone", "qpmPrintZoneHideIfEmpty", "qpmEmptyMessage", "qpmHideIfEmpty", "__splitRange", "__isSplit");
    private static final Pattern VERSION = Pattern.compile("[0-9]+\\.[0-9]+\\.[0-9]+");
    private static final Pattern STATIC_NAME = Pattern.compile("static:[A-Za-z0-9_.-]{1,96}");
    private static final Pattern FONT_NAME = Pattern.compile("[A-Za-z][A-Za-z0-9 _.-]{0,39}");
    private final DocumentDataProviderRegistry providerRegistry;

    public static boolean isPdfme(JsonNode configuration) {
        return configuration != null && configuration.isObject()
                && configuration.has("pdfmeVersion") && configuration.has("basePdf")
                && configuration.has("schemas") && !configuration.has("schemaVersion");
    }

    public JsonNode validate(JsonNode configuration, String documentType, String providerCode) {
        if (!"WORK_ORDER".equals(providerCode)
                || configuration == null || !configuration.isObject() || !hasOnly(configuration, ROOT_KEYS)) bad();
        String version = configuration.path("pdfmeVersion").asText("");
        if (!VERSION.matcher(version).matches() || !SUPPORTED_PDFME_VERSION.equals(version)) bad();

        JsonNode base = configuration.get("basePdf");
        if (base == null || !base.isObject() || !hasOnly(base, BASE_PDF_KEYS)) bad();
        double width = number(base.get("width"), 100, 500);
        double height = number(base.get("height"), 100, 500);
        boolean portrait = Math.abs(width - 210) < 0.01 && Math.abs(height - 297) < 0.01;
        boolean landscape = Math.abs(width - 297) < 0.01 && Math.abs(height - 210) < 0.01;
        if (!portrait && !landscape) bad();
        JsonNode zoneHeights = configuration.get("qpmPrintZoneHeights");
        if (zoneHeights != null) validatePrintZoneHeights(zoneHeights, height, configuration.path("schemas"));
        JsonNode padding = base.get("padding");
        if (padding == null || !padding.isArray() || padding.size() != 4) bad();
        for (JsonNode edge : padding) number(edge, 0, 30);

        JsonNode pages = configuration.get("schemas");
        if (pages == null || !pages.isArray() || pages.isEmpty() || pages.size() > 20) bad();
        DocumentDataProvider provider = providerRegistry.require("WORK_ORDER");
        int componentCount = 0;
        Set<String> printZoneNames = new HashSet<>();
        Map<String, Boolean> componentVisibility = new java.util.HashMap<>();
        Map<String, String> sectionComponents = new java.util.HashMap<>();
        Map<String, Boolean> zoneVisibility = new java.util.HashMap<>();
        Set<String> zonesWithDataBindings = new HashSet<>();
        Map<String, Integer> schemaNameCounts = new java.util.HashMap<>();
        for (JsonNode page : pages) {
            if (!page.isArray()) bad();
            for (JsonNode schema : page) {
                if (schema.isObject() && schema.path("name").isTextual()) {
                    schemaNameCounts.merge(schema.path("name").asText(), 1, Integer::sum);
                }
            }
        }
        for (JsonNode page : pages) {
            if (!page.isArray() || page.size() > 100) bad();
            Set<String> schemaNames = new HashSet<>();
            for (JsonNode schema : page) {
                if (++componentCount > 200 || !schema.isObject() || !hasOnly(schema, SCHEMA_KEYS)) bad();
                String name = schema.path("name").asText("");
                String type = schema.path("type").asText("");
                boolean isStatic = STATIC_NAME.matcher(name).matches();
                if (name.isBlank() || name.length() > 100 || (!isStatic && !provider.supports(name))
                        || !TYPES.contains(type) || !schemaNames.add(name)) bad();
                if (schema.has("qpmPrintZone")) {
                    String zone = schema.path("qpmPrintZone").asText("");
                    if (!("HEADER".equals(zone) || "FOOTER".equals(zone)
                            || "REPORT_HEADER".equals(zone) || "REPORT_FOOTER".equals(zone))
                            || "table".equals(type) || "signature".equals(type)
                            || schemaNameCounts.getOrDefault(name, 0) != 1 || !printZoneNames.add(name)) bad();
                    boolean hideZone = schema.path("qpmPrintZoneHideIfEmpty").asBoolean(false);
                    if (schema.has("qpmPrintZoneHideIfEmpty") && (!schema.get("qpmPrintZoneHideIfEmpty").isBoolean()
                            || !hideZone)) bad();
                    Boolean previousVisibility = zoneVisibility.putIfAbsent(zone, hideZone);
                    if (previousVisibility != null && previousVisibility != hideZone) bad();
                    if (!isStatic) zonesWithDataBindings.add(zone);
                } else if (schema.has("qpmPrintZoneHideIfEmpty")) {
                    bad();
                }
                if (schema.has("qpmEmptyMessage") && !"table".equals(type)) bad();
                if (schema.has("qpmComponent") && (!schema.get("qpmComponent").isTextual()
                        || !COMPONENTS.contains(schema.get("qpmComponent").asText()))) bad();
                if (schema.has("qpmSectionId") && (!schema.get("qpmSectionId").isTextual()
                        || !schema.get("qpmSectionId").asText().matches("[A-Za-z0-9_-]{1,80}")
                        || !schema.has("qpmComponent"))) bad();
                if (schema.has("qpmHideComponentIfEmpty") && (!schema.get("qpmHideComponentIfEmpty").isBoolean()
                        || !schema.get("qpmHideComponentIfEmpty").asBoolean() || !schema.has("qpmSectionId"))) bad();
                if (schema.has("qpmSectionId")) {
                    String sectionId = schema.get("qpmSectionId").asText();
                    String component = schema.get("qpmComponent").asText();
                    boolean hide = schema.path("qpmHideComponentIfEmpty").asBoolean(false);
                    String previousComponent = sectionComponents.putIfAbsent(sectionId, component);
                    if (previousComponent != null && !previousComponent.equals(component)) bad();
                    Boolean previous = componentVisibility.putIfAbsent(sectionId, hide);
                    if (previous != null && previous != hide) bad();
                }
                if (schema.has("qpmHideIfEmpty") && (!schema.get("qpmHideIfEmpty").isBoolean()
                        || !schema.get("qpmHideIfEmpty").asBoolean() || isStatic
                        || !("text".equals(type) || "multiVariableText".equals(type)))) bad();
                if ("table".equals(type) != TABLE_FIELDS.contains(name)) bad();
                if ("signature".equals(type) && !"workOrder.signature".equals(name)) bad();
                if ("image".equals(type) && !isStatic && !"company.logo".equals(name)) bad();
                if ("qrcode".equals(type) && !isStatic) bad();
                validateGeometry(schema, width, height);
                if (schema.has("content")) {
                    JsonNode content = schema.get("content");
                    if (!content.isTextual() || content.asText().length() > ("image".equals(type) ? 700_000 : 20_000)) bad();
                    if ("image".equals(type) && !content.asText().isBlank()
                            && !content.asText().matches("data:image/(png|jpeg);base64,[A-Za-z0-9+/=]+")) bad();
                }
                if ("table".equals(type)) validateTable(schema);
            }
        }
        if (componentCount == 0) bad();
        for (Map.Entry<String, Boolean> entry : zoneVisibility.entrySet()) {
            if (entry.getValue() && !zonesWithDataBindings.contains(entry.getKey())) bad();
        }
        validateFonts(configuration.get("font"));
        return configuration.deepCopy();
    }

    private void validatePrintZoneHeights(JsonNode heights, double pageHeight, JsonNode pages) {
        Set<String> zones = Set.of("HEADER", "FOOTER", "REPORT_HEADER", "REPORT_FOOTER");
        if (!heights.isObject() || heights.size() > zones.size()) bad();
        double topMax = Math.max(heightFor(heights, "HEADER", 20), heightFor(heights, "REPORT_HEADER", 32));
        double bottomMax = Math.max(heightFor(heights, "FOOTER", 20), heightFor(heights, "REPORT_FOOTER", 24));
        if (topMax + bottomMax > pageHeight - 30) bad();
        for (var entries = heights.fields(); entries.hasNext();) {
            var entry = entries.next();
            String zone = entry.getKey();
            JsonNode value = entry.getValue();
            if (!zones.contains(zone) || value == null || !value.isIntegralNumber()
                    || value.asInt() < 8 || value.asInt() > pageHeight / 2) bad();
            for (JsonNode page : pages) for (JsonNode schema : page) {
                if (!zone.equals(schema.path("qpmPrintZone").asText())) continue;
                double y = schema.path("position").path("y").asDouble();
                double bottom = y + schema.path("height").asDouble();
                boolean topZone = "HEADER".equals(zone) || "REPORT_HEADER".equals(zone);
                if (topZone ? (y < 0 || bottom > value.asDouble())
                        : (y < pageHeight - value.asDouble() || bottom > pageHeight)) bad();
            }
        }
    }

    private double heightFor(JsonNode heights, String zone, double fallback) {
        JsonNode configured = heights.get(zone);
        return configured != null && configured.isNumber() ? configured.asDouble() : fallback;
    }

    private void validateFonts(JsonNode fonts) {
        if (fonts == null) return;
        if (!fonts.isObject() || fonts.size() != 1) bad();
        var entries = fonts.fields();
        var entry = entries.next();
        JsonNode font = entry.getValue();
        if (!FONT_NAME.matcher(entry.getKey()).matches() || !font.isObject()
                || !hasOnly(font, Set.of("data", "fallback", "subset"))) bad();
        String data = font.path("data").asText("");
        if (data.length() > 700_000 || !data.matches("data:font/(ttf|otf);base64,[A-Za-z0-9+/]+={0,2}")) bad();
        String encoded = data.substring(data.indexOf(',') + 1);
        if (encoded.length() < 8 || encoded.length() % 4 != 0) bad();
        try {
            byte[] bytes = Base64.getDecoder().decode(encoded);
            if (bytes.length > 512 * 1024 || !validFontSignature(bytes)) bad();
        } catch (IllegalArgumentException exception) {
            bad();
        }
        if (font.has("fallback") && !font.get("fallback").isBoolean()) bad();
        if (font.has("subset") && !font.get("subset").isBoolean()) bad();
    }

    private boolean validFontSignature(byte[] bytes) {
        if (bytes.length < 4) return false;
        return (bytes[0] == 0 && bytes[1] == 1 && bytes[2] == 0 && bytes[3] == 0)
                || (bytes[0] == 'O' && bytes[1] == 'T' && bytes[2] == 'T' && bytes[3] == 'O')
                || (bytes[0] == 't' && bytes[1] == 'r' && bytes[2] == 'u' && bytes[3] == 'e')
                || (bytes[0] == 't' && bytes[1] == 'y' && bytes[2] == 'p' && bytes[3] == '1');
    }

    /** Lists authorized provider keys in document order, excluding static text/image names. */
    public List<String> dataBindings(JsonNode configuration) {
        List<String> keys = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (JsonNode page : configuration.path("schemas")) {
            for (JsonNode schema : page) {
                String name = schema.path("name").asText();
                if (!STATIC_NAME.matcher(name).matches() && seen.add(name)) keys.add(name);
            }
        }
        return keys;
    }

    private void validateGeometry(JsonNode schema, double pageWidth, double pageHeight) {
        JsonNode position = schema.get("position");
        if (position == null || !position.isObject() || !hasOnly(position, Set.of("x", "y"))) bad();
        double x = number(position.get("x"), 0, pageWidth);
        double y = number(position.get("y"), 0, pageHeight);
        double width = number(schema.get("width"), 0.1, pageWidth);
        double height = number(schema.get("height"), 0.1, pageHeight);
        if (x + width > pageWidth || y + height > pageHeight) bad();
        if (schema.has("rotate")) number(schema.get("rotate"), -360, 360);
        if (schema.has("opacity")) number(schema.get("opacity"), 0, 1);
        if (schema.has("fontSize")) number(schema.get("fontSize"), 4, 48);
    }

    private void validateTable(JsonNode schema) {
        JsonNode headers = schema.get("head");
        if (headers == null || !headers.isArray() || headers.isEmpty() || headers.size() > 12) bad();
        for (JsonNode header : headers) if (!header.isTextual() || header.asText().length() > 100) bad();
        JsonNode widths = schema.get("headWidthPercentages");
        if (widths != null) {
            if (!widths.isArray() || widths.size() != headers.size()) bad();
            double total = 0;
            for (JsonNode width : widths) total += number(width, 1, 100);
            if (Math.abs(total - 100) > 1) bad();
        }
        if (schema.has("showHead") && !schema.get("showHead").isBoolean()) bad();
        if (schema.has("repeatHead") && !schema.get("repeatHead").isBoolean()) bad();
        if (schema.has("qpmEmptyMessage")) {
            JsonNode message = schema.get("qpmEmptyMessage");
            if (!message.isTextual() || message.asText().length() > 200) bad();
        }
        if (schema.has("columnBindings")) {
            JsonNode bindings = schema.get("columnBindings");
            if (!bindings.isArray() || bindings.size() != headers.size()) bad();
            List<String> allowed = switch (schema.path("name").asText()) {
                case "workOrder.executionTasks" -> List.of("step", "task", "result", "notes");
                case "workOrder.laborTimeEntries" -> List.of("technician", "activity", "startedAt", "durationHours", "status");
                case "workOrder.materialsUsed" -> List.of("part", "description", "quantity", "unit");
                default -> List.of();
            };
            Set<String> seen = new HashSet<>();
            for (JsonNode binding : bindings) {
                if (!binding.isTextual()) bad();
                String key = binding.asText();
                if (!key.isBlank() && (!allowed.contains(key) || !seen.add(key))) bad();
            }
        }
    }

    private double number(JsonNode value, double min, double max) {
        if (value == null || !value.isNumber()) bad();
        double result = value.asDouble();
        if (!Double.isFinite(result) || result < min || result > max) bad();
        return result;
    }

    private boolean hasOnly(JsonNode object, Set<String> allowed) {
        var keys = object.fieldNames();
        while (keys.hasNext()) if (!allowed.contains(keys.next())) return false;
        return true;
    }

    private void bad() {
        throw new CustomException("Unsupported PDFME Work Order template configuration", HttpStatus.BAD_REQUEST);
    }
}
