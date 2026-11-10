package com.grash.service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * What the visual (PDFME) designer may bind for one document type: repeated tables and their columns, the
 * signature field and the component palette. The validator and the renderer read the same profile, so a
 * template accepted at save time can always be rendered. Field keys themselves are owned by the type's
 * {@link DocumentDataProvider}.
 */
public record PdfmeDocumentProfile(String providerCode,
                                   Map<String, List<String>> tableColumns,
                                   String signatureField,
                                   Set<String> components) {

    public static final String LOGO_FIELD = "company.logo";

    private static final Map<String, PdfmeDocumentProfile> PROFILES = Map.of(
            "WORK_ORDER", new PdfmeDocumentProfile("WORK_ORDER", Map.of(
                    "workOrder.executionTasks", List.of("step", "task", "result", "notes"),
                    "workOrder.laborTimeEntries", List.of("technician", "activity", "startedAt", "durationHours", "status"),
                    "workOrder.materialsUsed", List.of("part", "description", "quantity", "unit")),
                    "workOrder.signature",
                    Set.of("summary", "people", "tasks", "labor", "materials", "signoff", "comments", "history",
                            "relations", "customFields", "attachments")),
            "PURCHASE_ORDER", new PdfmeDocumentProfile("PURCHASE_ORDER", Map.of(
                    "purchaseOrder.lines", List.of("part", "description", "quantity", "unit", "unitPrice", "currency",
                            "lineTotal", "site")),
                    null,
                    Set.of("summary", "vendor", "shipping", "lines", "approvals", "notes")),
            "PURCHASE_REQUISITION", new PdfmeDocumentProfile("PURCHASE_REQUISITION", Map.of(
                    "purchaseRequisition.lines", List.of("part", "description", "quantity", "unit", "notes", "site")),
                    null,
                    Set.of("summary", "lines", "approvals", "justification")));

    public static Optional<PdfmeDocumentProfile> forProvider(String providerCode) {
        return Optional.ofNullable(providerCode == null ? null : PROFILES.get(providerCode));
    }

    public boolean isTable(String field) {
        return tableColumns.containsKey(field);
    }

    public List<String> columnsOf(String field) {
        return tableColumns.getOrDefault(field, List.of());
    }
}
