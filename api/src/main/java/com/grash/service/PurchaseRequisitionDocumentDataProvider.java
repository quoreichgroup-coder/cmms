package com.grash.service;

import com.grash.exception.CustomException;
import com.grash.model.PurchaseRequisition;
import com.grash.model.PurchaseRequisitionLine;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;

/** Safe PR print bindings. Estimates are deliberately omitted because they are not approved supplier prices. */
@Component
public class PurchaseRequisitionDocumentDataProvider implements DocumentDataProvider {
    private static final String LINES = "purchaseRequisition.lines";
    private static final Set<String> FIELDS = Set.of("purchaseRequisition.number", "purchaseRequisition.title",
            "purchaseRequisition.status", "purchaseRequisition.justification", "purchaseRequisition.requiredDate",
            "purchaseRequisition.requester", "purchaseRequisition.sourceWorkOrder", "purchaseRequisition.createdDate", "company.name", "company.legalName",
            "company.registeredAddress", "company.registrationNumber", "company.taxNumber", "company.phone",
            "company.email", "company.logo", "site.name", "purchaseRequisition.approvalHistory", LINES);
    private final ProcurementApprovalPrintService approvalPrintService;
    private final DocumentLogoService logoService;
    private final DocumentContextResolver contextResolver;
    public PurchaseRequisitionDocumentDataProvider(ProcurementApprovalPrintService approvalPrintService,
                                                   DocumentLogoService logoService, DocumentContextResolver contextResolver) {
        this.approvalPrintService = approvalPrintService;
        this.logoService = logoService;
        this.contextResolver = contextResolver;
    }
    @Override public String providerCode() { return "PURCHASE_REQUISITION"; }
    @Override public boolean supports(String key) { return FIELDS.contains(key); }
    @Override public Map<String,Object> resolve(Object source, DocumentContextResolver.DocumentContext context,
                                                 Set<String> requestedFields) {
        if (!(source instanceof PurchaseRequisition pr)) throw new CustomException("Purchase requisition required", HttpStatus.BAD_REQUEST);
        if (requestedFields == null || requestedFields.isEmpty() || requestedFields.size() > FIELDS.size() || !FIELDS.containsAll(requestedFields))
            throw new CustomException("Unsupported purchase requisition fields", HttpStatus.BAD_REQUEST);
        Map<String,Object> out = new LinkedHashMap<>();
        for (String key : requestedFields) out.put(key, switch (key) {
            case "purchaseRequisition.number" -> pr.getId() == null ? null : "PR-" + pr.getId();
            case "purchaseRequisition.title" -> pr.getTitle();
            case "purchaseRequisition.status" -> status(pr.getStatus() == null ? null : pr.getStatus().name(), context);
            case "purchaseRequisition.justification" -> pr.getJustification();
            case "purchaseRequisition.requiredDate" -> iso(pr.getRequiredDate());
            case "purchaseRequisition.requester" -> pr.getRequester() == null ? null
                    : (pr.getRequester().getFirstName() + " " + pr.getRequester().getLastName()).trim();
            case "purchaseRequisition.sourceWorkOrder" -> pr.getSourceWorkOrder() == null ? null
                    : "WO-" + pr.getSourceWorkOrder().getId();
            case "purchaseRequisition.createdDate" -> iso(pr.getCreatedAt());
            case "purchaseRequisition.approvalHistory" -> approvalPrintService.history("PR", pr.getId(),
                    pr.getCompany() == null ? null : pr.getCompany().getId(), context.language());
            case LINES -> pr.getLines().stream().map(this::line).toList();
            case "company.name" -> context.companyName(); case "company.legalName" -> context.legalName();
            case "company.registeredAddress" -> context.registeredAddress(); case "company.registrationNumber" -> context.registrationNumber();
            case "company.taxNumber" -> context.taxNumber(); case "company.phone" -> context.phone();
            case "company.email" -> context.email(); case "site.name" -> context.siteName();
            case "company.logo" -> logoService.logoDataUri(pr.getCompany(), contextResolver.siteOf(pr));
            default -> throw new CustomException("Unsupported purchase requisition field", HttpStatus.BAD_REQUEST);
        });
        return out;
    }
    private Map<String,Object> line(PurchaseRequisitionLine line) {
        Map<String,Object> row = new LinkedHashMap<>();
        row.put("part", line.getPart() == null ? "" : line.getPart().getName());
        row.put("description", line.getPart() == null ? "" : line.getPart().getDescription());
        row.put("quantity", line.getQuantity());
        row.put("unit", line.getPart() == null || line.getPart().getUnit() == null ? "" : line.getPart().getUnit());
        row.put("notes", line.getNotes());
        row.put("site", line.getSite() == null ? "" : line.getSite().getName());
        return row;
    }
    private String iso(Date date) { return date == null ? null : Instant.ofEpochMilli(date.getTime()).toString(); }
    private String status(String value, DocumentContextResolver.DocumentContext context) {
        if (value == null) return null;
        boolean fr = context.language() == com.grash.model.enums.Language.FR;
        return switch (value) {
            case "DRAFT" -> fr ? "Brouillon" : "Draft";
            case "PENDING_APPROVAL" -> fr ? "En attente d’approbation" : "Pending approval";
            case "APPROVED" -> fr ? "Approuvée" : "Approved";
            case "PARTIALLY_ORDERED" -> fr ? "Partiellement commandée" : "Partially ordered";
            case "ORDERED" -> fr ? "Commandée" : "Ordered";
            case "REJECTED" -> fr ? "Refusée" : "Rejected";
            case "CANCELLED" -> fr ? "Annulée" : "Cancelled";
            default -> value;
        };
    }
}
