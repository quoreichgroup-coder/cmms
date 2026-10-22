package com.grash.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.grash.exception.CustomException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.stream.StreamSupport;

/** Validates the declarative template v1 schema; it never evaluates tenant-provided code. */
@Component
@RequiredArgsConstructor
public class ReportTemplateConfigurationValidator {
    private static final Set<String> ROOT_KEYS = Set.of(
            "schemaVersion", "documentType", "provider", "style", "page", "visibleFields", "options");
    private static final Set<String> PAGE_KEYS = Set.of("size", "orientation", "marginMm");
    private static final Set<String> OPTION_KEYS = Set.of("showPageNumbers", "repeatTableHeader");
    private static final Set<String> PAGE_SIZES = Set.of("A4", "LETTER");
    private static final Set<String> ORIENTATIONS = Set.of("PORTRAIT", "LANDSCAPE");
    private static final Set<String> STYLES = Set.of("CLASSIC", "COMPACT");
    private final DocumentDataProviderRegistry registry;

    public JsonNode validate(JsonNode configuration, String expectedDocumentType, String expectedProvider) {
        if (configuration == null || !configuration.isObject() || !hasOnly(configuration, ROOT_KEYS)) bad();
        if (!"1.0".equals(text(configuration, "schemaVersion"))
                || !expectedDocumentType.equals(text(configuration, "documentType"))
                || !expectedProvider.equals(text(configuration, "provider"))) bad();
        if (!registry.contains(expectedProvider)) bad();
        if (!STYLES.contains(text(configuration, "style"))) bad();

        JsonNode page = configuration.get("page");
        if (page == null || !page.isObject() || !hasOnly(page, PAGE_KEYS)
                || !PAGE_SIZES.contains(text(page, "size"))
                || !ORIENTATIONS.contains(text(page, "orientation"))) bad();
        JsonNode margin = page.get("marginMm");
        if (margin == null || !margin.canConvertToInt() || margin.asInt() < 5 || margin.asInt() > 30) bad();

        JsonNode fields = configuration.get("visibleFields");
        if (fields == null || !fields.isArray() || fields.isEmpty() || fields.size() > 23) bad();
        Set<String> uniqueFields = StreamSupport.stream(fields.spliterator(), false)
                .filter(JsonNode::isTextual).map(JsonNode::asText).collect(java.util.stream.Collectors.toSet());
        if (uniqueFields.size() != fields.size()) bad();
        DocumentDataProvider provider = registry.require(expectedProvider);
        if (uniqueFields.stream().anyMatch(field -> !provider.supports(field))) bad();

        JsonNode options = configuration.get("options");
        if (options == null || !options.isObject() || !hasOnly(options, OPTION_KEYS)
                || !booleanField(options, "showPageNumbers")
                || !booleanField(options, "repeatTableHeader")) bad();
        return configuration.deepCopy();
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
