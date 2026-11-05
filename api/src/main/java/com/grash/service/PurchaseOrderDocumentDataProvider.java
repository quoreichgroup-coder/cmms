package com.grash.service;

import com.grash.exception.CustomException;
import com.grash.model.PartQuantity;
import com.grash.model.PurchaseOrder;
import com.grash.repository.PartQuantityRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;

/** PO print bindings; supplier prices are emitted only when explicitly recorded on the order line. */
@Component
public class PurchaseOrderDocumentDataProvider implements DocumentDataProvider {
    private static final String LINES = "purchaseOrder.lines";
    private static final Set<String> FIELDS = Set.of("purchaseOrder.number", "purchaseOrder.name",
            "purchaseOrder.status", "purchaseOrder.vendor", "purchaseOrder.category",
            "purchaseOrder.vendorAddress", "purchaseOrder.vendorPhone", "purchaseOrder.vendorEmail",
            "purchaseOrder.shippingDueDate", "purchaseOrder.shipTo", "purchaseOrder.shippingAddress",
            "purchaseOrder.shippingCity", "purchaseOrder.shippingState", "purchaseOrder.shippingZipCode",
            "purchaseOrder.shippingPhone", "purchaseOrder.shippingFax", "purchaseOrder.terms",
            "purchaseOrder.notes", "purchaseOrder.requestedBy", "purchaseOrder.date", "purchaseOrder.requisition", "purchaseOrder.approvalHistory",
            "company.name", "company.legalName", "company.registeredAddress", "company.registrationNumber",
            "company.taxNumber", "company.phone", "company.email", "site.name", LINES);
    private final PartQuantityRepository lines;
    private final ProcurementApprovalPrintService approvalPrintService;

    public PurchaseOrderDocumentDataProvider(PartQuantityRepository lines, ProcurementApprovalPrintService approvalPrintService) {
        this.lines = lines;
        this.approvalPrintService = approvalPrintService;
    }
    @Override public String providerCode() { return "PURCHASE_ORDER"; }
    @Override public boolean supports(String key) { return FIELDS.contains(key); }

    @Override public Map<String, Object> resolve(Object source, DocumentContextResolver.DocumentContext context,
                                                  Set<String> requestedFields) {
        if (!(source instanceof PurchaseOrder po)) throw new CustomException("Purchase order required", HttpStatus.BAD_REQUEST);
        validate(requestedFields);
        Collection<PartQuantity> orderLines = requestedFields.contains(LINES) || requestedFields.contains("purchaseOrder.requisition")
                ? lines.findDocumentLinesByPurchaseOrderId(po.getId()) : List.of();
        Map<String,Object> out = new LinkedHashMap<>();
        for (String key : requestedFields) out.put(key, switch (key) {
            case "purchaseOrder.number" -> po.getId() == null ? null : "PO-" + po.getId();
            case "purchaseOrder.name" -> po.getName();
            case "purchaseOrder.status" -> status(po.getStatus() == null ? null : po.getStatus().name(), context);
            case "purchaseOrder.vendor" -> po.getVendor() == null ? null : po.getVendor().getCompanyName();
            case "purchaseOrder.vendorAddress" -> po.getVendor() == null ? null : po.getVendor().getAddress();
            case "purchaseOrder.vendorPhone" -> po.getVendor() == null ? null : po.getVendor().getPhone();
            case "purchaseOrder.vendorEmail" -> po.getVendor() == null ? null : po.getVendor().getEmail();
            case "purchaseOrder.category" -> po.getCategory() == null ? null : po.getCategory().getName();
            case "purchaseOrder.shippingDueDate" -> iso(po.getShippingDueDate());
            case "purchaseOrder.date" -> iso(po.getAdditionalInfoDate());
            case "purchaseOrder.shipTo" -> po.getShippingShipToName();
            case "purchaseOrder.shippingAddress" -> po.getShippingAddress();
            case "purchaseOrder.shippingCity" -> po.getShippingCity();
            case "purchaseOrder.shippingState" -> po.getShippingState();
            case "purchaseOrder.shippingZipCode" -> po.getShippingZipCode();
            case "purchaseOrder.shippingPhone" -> po.getShippingPhone();
            case "purchaseOrder.shippingFax" -> po.getShippingFax();
            case "purchaseOrder.terms" -> po.getAdditionalInfoTerm();
            case "purchaseOrder.notes" -> po.getAdditionalInfoNotes();
            case "purchaseOrder.requestedBy" -> po.getAdditionalInfoRequisitionedName();
            case "purchaseOrder.requisition" -> requisitionReferences(orderLines);
            case "purchaseOrder.approvalHistory" -> approvalPrintService.history("PO", po.getId(),
                    po.getCompany() == null ? null : po.getCompany().getId(), context.language());
            case LINES -> orderLines.stream().map(this::line).toList();
            case "company.name" -> context.companyName(); case "company.legalName" -> context.legalName();
            case "company.registeredAddress" -> context.registeredAddress(); case "company.registrationNumber" -> context.registrationNumber();
            case "company.taxNumber" -> context.taxNumber(); case "company.phone" -> context.phone();
            case "company.email" -> context.email(); case "site.name" -> context.siteName();
            default -> throw new CustomException("Unsupported purchase order field", HttpStatus.BAD_REQUEST);
        });
        return out;
    }
    private Map<String,Object> line(PartQuantity line) {
        Map<String,Object> row = new LinkedHashMap<>();
        row.put("part", line.getPart() == null ? "" : line.getPart().getName());
        row.put("description", line.getPart() == null ? "" : line.getPart().getDescription());
        row.put("quantity", line.getQuantity());
        row.put("unit", line.getPart() == null || line.getPart().getUnit() == null ? "" : line.getPart().getUnit());
        row.put("unitPrice", line.getPurchaseUnitPrice() == null ? "" : decimal(line.getPurchaseUnitPrice()));
        row.put("currency", line.getPurchasePriceCurrency() == null ? "" : line.getPurchasePriceCurrency());
        row.put("lineTotal", line.getPurchaseUnitPrice() == null ? ""
                : decimal(line.getPurchaseUnitPrice().multiply(java.math.BigDecimal.valueOf(line.getQuantity()))));
        row.put("site", line.getSite() == null ? "" : line.getSite().getName());
        return row;
    }
    private String decimal(java.math.BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }
    private String requisitionReferences(Collection<PartQuantity> orderLines) {
        return orderLines.stream()
                .map(PartQuantity::getRequisitionLine)
                .filter(Objects::nonNull)
                .map(line -> line.getRequisition())
                .filter(Objects::nonNull)
                .map(requisition -> requisition.getId() == null ? null : "PR-" + requisition.getId())
                .filter(Objects::nonNull).distinct().sorted().reduce((left, right) -> left + ", " + right).orElse("");
    }
    private void validate(Set<String> requested) {
        if (requested == null || requested.isEmpty() || requested.size() > FIELDS.size() || !FIELDS.containsAll(requested))
            throw new CustomException("Unsupported purchase order fields", HttpStatus.BAD_REQUEST);
    }
    private String iso(Date date) { return date == null ? null : Instant.ofEpochMilli(date.getTime()).toString(); }
    private String status(String value, DocumentContextResolver.DocumentContext context) {
        if (value == null) return null;
        boolean fr = context.language() == com.grash.model.enums.Language.FR;
        return switch (value) {
            case "APPROVED" -> fr ? "Approuvé" : "Approved";
            case "PENDING" -> fr ? "En attente d’approbation" : "Pending approval";
            case "REJECTED" -> fr ? "Refusé" : "Rejected";
            default -> value;
        };
    }
}
