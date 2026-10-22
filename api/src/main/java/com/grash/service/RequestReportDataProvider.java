package com.grash.service;

import com.grash.exception.CustomException;
import com.grash.model.Request;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/** Resolves a deliberately small, non-financial allowlist for maintenance-request documents. */
@Component
public class RequestReportDataProvider implements DocumentDataProvider {
    private static final Set<String> SUPPORTED_FIELDS = Set.of(
            "request.customId", "request.title", "request.description", "request.priority",
            "request.dueDate", "request.estimatedDuration", "request.contact", "request.cancelled",
            "asset.name", "asset.serialNumber", "location.name", "request.team", "site.name",
            "company.name", "company.legalName", "company.registeredAddress", "company.registrationNumber",
            "company.taxNumber", "company.phone", "company.email");

    @Override
    public String providerCode() {
        return "REQUEST";
    }

    @Override
    public boolean supports(String fieldKey) {
        return SUPPORTED_FIELDS.contains(fieldKey);
    }

    @Override
    public Map<String, Object> resolve(Object source, DocumentContextResolver.DocumentContext context,
                                       Set<String> requestedFields) {
        if (!(source instanceof Request request)) {
            throw new CustomException("Maintenance request source is required", HttpStatus.BAD_REQUEST);
        }
        if (requestedFields == null || requestedFields.isEmpty()
                || requestedFields.size() > SUPPORTED_FIELDS.size()) {
            throw new CustomException("Select between 1 and " + SUPPORTED_FIELDS.size()
                    + " supported request fields", HttpStatus.BAD_REQUEST);
        }
        if (!SUPPORTED_FIELDS.containsAll(requestedFields)) {
            throw new CustomException("One or more request fields are not supported", HttpStatus.BAD_REQUEST);
        }

        Map<String, Object> values = new LinkedHashMap<>();
        for (String field : requestedFields) values.put(field, valueFor(field, request, context));
        return values;
    }

    private Object valueFor(String field, Request request, DocumentContextResolver.DocumentContext context) {
        return switch (field) {
            case "request.customId" -> request.getCustomId();
            case "request.title" -> request.getTitle();
            case "request.description" -> request.getDescription();
            case "request.priority" -> request.getPriority() == null ? null : request.getPriority().name();
            case "request.dueDate" -> iso(request.getDueDate());
            case "request.estimatedDuration" -> request.getEstimatedDuration();
            case "request.contact" -> request.getContact();
            case "request.cancelled" -> request.isCancelled();
            case "asset.name" -> request.getAsset() == null ? null : request.getAsset().getName();
            case "asset.serialNumber" -> request.getAsset() == null ? null : request.getAsset().getSerialNumber();
            case "location.name" -> request.getLocation() == null ? null : request.getLocation().getName();
            case "request.team" -> request.getTeam() == null ? null : request.getTeam().getName();
            case "site.name" -> context.siteName();
            case "company.name" -> context.companyName();
            case "company.legalName" -> context.legalName();
            case "company.registeredAddress" -> context.registeredAddress();
            case "company.registrationNumber" -> context.registrationNumber();
            case "company.taxNumber" -> context.taxNumber();
            case "company.phone" -> context.phone();
            case "company.email" -> context.email();
            default -> throw new CustomException("Request field is not supported", HttpStatus.BAD_REQUEST);
        };
    }

    private String iso(java.util.Date value) {
        return value == null ? null : Instant.ofEpochMilli(value.getTime()).toString();
    }
}
