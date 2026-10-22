package com.grash.service;

import com.grash.exception.CustomException;
import com.grash.model.User;
import com.grash.model.WorkOrder;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/** Resolves a deliberately small, explicit allowlist of non-cost fields for report previews. */
@Component
public class WorkOrderReportDataProvider implements DocumentDataProvider {
    private static final Set<String> SUPPORTED_FIELDS = Set.of(
            "workOrder.customId", "workOrder.title", "workOrder.description", "workOrder.status",
            "workOrder.priority", "workOrder.dueDate", "workOrder.completedAt", "workOrder.estimatedDuration",
            "workOrder.category", "workOrder.team", "workOrder.completedBy", "workOrder.assignedTo",
            "asset.name", "asset.serialNumber", "location.name", "site.name", "company.name",
            "company.legalName", "company.registeredAddress", "company.registrationNumber", "company.taxNumber",
            "company.phone", "company.email");

    @Override
    public String providerCode() {
        return "WORK_ORDER";
    }

    @Override
    public boolean supports(String fieldKey) {
        return SUPPORTED_FIELDS.contains(fieldKey);
    }

    @Override
    public Map<String, Object> resolve(Object source,
                                       DocumentContextResolver.DocumentContext context,
                                       Set<String> requestedFields) {
        if (!(source instanceof WorkOrder workOrder)) {
            throw new CustomException("Work order source is required", HttpStatus.BAD_REQUEST);
        }
        if (requestedFields == null || requestedFields.isEmpty() || requestedFields.size() > SUPPORTED_FIELDS.size()) {
            throw new CustomException("Select between 1 and " + SUPPORTED_FIELDS.size() + " supported report fields",
                    HttpStatus.BAD_REQUEST);
        }
        if (!SUPPORTED_FIELDS.containsAll(requestedFields)) {
            throw new CustomException("One or more report fields are not supported for preview", HttpStatus.BAD_REQUEST);
        }

        Map<String, Object> values = new LinkedHashMap<>();
        for (String field : requestedFields) {
            values.put(field, valueFor(field, workOrder, context));
        }
        return values;
    }

    private Object valueFor(String field, WorkOrder order, DocumentContextResolver.DocumentContext context) {
        return switch (field) {
            case "workOrder.customId" -> order.getCustomId();
            case "workOrder.title" -> order.getTitle();
            case "workOrder.description" -> order.getDescription();
            case "workOrder.status" -> order.getStatus() == null ? null : order.getStatus().name();
            case "workOrder.priority" -> order.getPriority() == null ? null : order.getPriority().name();
            case "workOrder.dueDate" -> iso(order.getDueDate());
            case "workOrder.completedAt" -> iso(order.getCompletedOn());
            case "workOrder.estimatedDuration" -> order.getEstimatedDuration();
            case "workOrder.category" -> order.getCategory() == null ? null : order.getCategory().getName();
            case "workOrder.team" -> order.getTeam() == null ? null : order.getTeam().getName();
            case "workOrder.completedBy" -> displayName(order.getCompletedBy());
            case "workOrder.assignedTo" -> order.getAssignedTo() == null ? java.util.List.of()
                    : order.getAssignedTo().stream().map(this::displayName).toList();
            case "asset.name" -> order.getAsset() == null ? null : order.getAsset().getName();
            case "asset.serialNumber" -> order.getAsset() == null ? null : order.getAsset().getSerialNumber();
            case "location.name" -> order.getLocation() == null ? null : order.getLocation().getName();
            case "site.name" -> context.siteName();
            case "company.name" -> context.companyName();
            case "company.legalName" -> context.legalName();
            case "company.registeredAddress" -> context.registeredAddress();
            case "company.registrationNumber" -> context.registrationNumber();
            case "company.taxNumber" -> context.taxNumber();
            case "company.phone" -> context.phone();
            case "company.email" -> context.email();
            default -> throw new CustomException("Report field is not supported", HttpStatus.BAD_REQUEST);
        };
    }

    private String iso(Date value) {
        return value == null ? null : Instant.ofEpochMilli(value.getTime()).toString();
    }

    private String displayName(User user) {
        if (user == null) return null;
        return ((user.getFirstName() == null ? "" : user.getFirstName()) + " "
                + (user.getLastName() == null ? "" : user.getLastName())).trim();
    }
}
