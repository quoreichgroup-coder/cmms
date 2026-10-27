package com.grash.service;

import com.grash.exception.CustomException;
import com.grash.factory.StorageServiceFactory;
import com.grash.model.File;
import com.grash.model.Comment;
import com.grash.model.Relation;
import com.grash.model.User;
import com.grash.model.WorkOrder;
import com.grash.model.WorkOrderHistory;
import com.grash.model.Labor;
import com.grash.model.PartQuantity;
import com.grash.model.enums.TimeStatus;
import com.grash.model.enums.RelationType;
import com.grash.dto.license.LicenseEntitlement;
import com.grash.dto.ReportFieldDiagnosisDTO;
import com.grash.dto.ReportTablePreviewDTO;
import com.grash.repository.CommentRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import lombok.RequiredArgsConstructor;

import java.util.Collection;
import java.time.Instant;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.Base64;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Resolves an explicit allowlist of non-cost fields for report previews and Job Cards. */
@Component
@RequiredArgsConstructor
@Slf4j
public class WorkOrderReportDataProvider implements DocumentDataProvider {
    private static final int MAX_SIGNATURE_BYTES = 512 * 1024;
    private static final int MAX_COMPANY_LOGO_BYTES = 512 * 1024;
    private static final Pattern SIGNATURE_DATA_URI = Pattern.compile(
            "^data:image/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$", Pattern.CASE_INSENSITIVE);
    private static final Set<String> SUPPORTED_FIELDS = Set.of(
            "workOrder.customId", "workOrder.title", "workOrder.description", "workOrder.status",
            "workOrder.priority", "workOrder.dueDate", "workOrder.completedAt", "workOrder.estimatedDuration",
            "workOrder.actualDuration",
            "workOrder.category", "workOrder.team", "workOrder.completedBy", "workOrder.assignedTo",
            "workOrder.primaryUser", "workOrder.customers", "workOrder.createdBy",
            "asset.name", "asset.serialNumber", "location.name", "site.name", "company.name",
            "company.legalName", "company.registeredAddress", "company.registrationNumber", "company.taxNumber",
            "company.phone", "company.email", "company.logo", "workOrder.executionTasks",
            "workOrder.laborTimeEntries", "workOrder.materialsUsed", "workOrder.customFields",
            "workOrder.files", "workOrder.feedback", "workOrder.signature", "workOrder.comments",
            "workOrder.history", "workOrder.relations");
    private final TaskService taskService;
    private final LaborService laborService;
    private final PartQuantityService partQuantityService;
    private final StorageServiceFactory storageServiceFactory;
    private final CommentRepository commentRepository;
    private final WorkOrderHistoryService workOrderHistoryService;
    private final RelationService relationService;
    private final LicenseService licenseService;
    private final UserService userService;

    @Override
    public String providerCode() {
        return "WORK_ORDER";
    }

    @Override
    public boolean supports(String fieldKey) {
        return SUPPORTED_FIELDS.contains(fieldKey);
    }

    /** Returns only availability and row counts; report values never leave the provider in diagnostics. */
    public Map<String, ReportFieldDiagnosisDTO> diagnose(WorkOrder order,
            DocumentContextResolver.DocumentContext context, Set<String> requestedFields) {
        Map<String, Object> values = resolve(order, context, requestedFields);
        Map<String, ReportFieldDiagnosisDTO> result = new LinkedHashMap<>();
        for (String field : requestedFields) {
            if (("workOrder.laborTimeEntries".equals(field) || "workOrder.actualDuration".equals(field))
                    && !licenseService.hasEntitlement(LicenseEntitlement.TIME_TRACKING)) {
                result.put(field, new ReportFieldDiagnosisDTO("unavailable", null));
                continue;
            }
            if ("workOrder.relations".equals(field)
                    && !licenseService.hasEntitlement(LicenseEntitlement.WORK_ORDER_LINKING)) {
                result.put(field, new ReportFieldDiagnosisDTO("unavailable", null));
                continue;
            }
            if (isUnlinkedField(order, field)) {
                result.put(field, new ReportFieldDiagnosisDTO("unlinked", null));
                continue;
            }
            Object value = values.get(field);
            if (value instanceof Collection<?> collection) {
                result.put(field, new ReportFieldDiagnosisDTO(
                        collection.isEmpty() ? "empty" : "available", collection.size()));
            } else {
                boolean empty = value == null || value instanceof CharSequence text && text.toString().isBlank();
                result.put(field, new ReportFieldDiagnosisDTO(empty ? "empty" : "available", null));
            }
        }
        return result;
    }

    /** Distinguishes an absent business relationship from a linked record with a blank value. */
    private boolean isUnlinkedField(WorkOrder order, String field) {
        return switch (field) {
            case "asset.name", "asset.serialNumber" -> order.getAsset() == null;
            case "location.name" -> order.getLocation() == null;
            case "site.name" -> order.getSite() == null;
            case "workOrder.team" -> order.getTeam() == null;
            case "workOrder.category" -> order.getCategory() == null;
            case "workOrder.completedBy" -> order.getCompletedBy() == null;
            case "workOrder.primaryUser" -> order.getPrimaryUser() == null;
            case "workOrder.assignedTo" -> order.getAssignedTo() == null || order.getAssignedTo().isEmpty();
            default -> false;
        };
    }

    /** Returns at most five rows and only the explicitly selected columns for an authorized table binding. */
    public ReportTablePreviewDTO previewTable(WorkOrder order,
            DocumentContextResolver.DocumentContext context, String binding, List<String> columns) {
        List<String> allowedColumns = switch (binding) {
            case "workOrder.executionTasks" -> List.of("step", "task", "result", "notes");
            case "workOrder.laborTimeEntries" -> List.of("technician", "activity", "startedAt", "durationHours", "status");
            case "workOrder.materialsUsed" -> List.of("part", "description", "quantity", "unit");
            default -> throw new CustomException("Report table is not supported", HttpStatus.BAD_REQUEST);
        };
        if (columns == null || columns.isEmpty() || columns.size() > allowedColumns.size()
                || columns.stream().anyMatch(column -> !allowedColumns.contains(column))
                || new java.util.HashSet<>(columns).size() != columns.size()) {
            throw new CustomException("Report table columns are not supported", HttpStatus.BAD_REQUEST);
        }
        if (("workOrder.laborTimeEntries".equals(binding)
                && !licenseService.hasEntitlement(LicenseEntitlement.TIME_TRACKING))
                || order.getId() == null || order.getCompany() == null) {
            return new ReportTablePreviewDTO("unavailable", 0, List.of());
        }
        Object value = resolve(order, context, Set.of(binding)).get(binding);
        if (!(value instanceof List<?> sourceRows)) return new ReportTablePreviewDTO("empty", 0, List.of());
        List<Map<String, String>> rows = new java.util.ArrayList<>();
        for (Object sourceRow : sourceRows.stream().limit(5).toList()) {
            if (!(sourceRow instanceof Map<?, ?> source)) continue;
            Map<String, String> row = new LinkedHashMap<>();
            for (String column : columns) row.put(column, previewCell(source.get(column)));
            rows.add(row);
        }
        return new ReportTablePreviewDTO(rows.isEmpty() ? "empty" : "available", sourceRows.size(), List.copyOf(rows));
    }

    private String previewCell(Object value) {
        if (value == null) return "";
        if (!(value instanceof String || value instanceof Number || value instanceof Boolean)) return "";
        String text = value.toString();
        return text.length() <= 160 ? text : text.substring(0, 157) + "…";
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
            case "workOrder.actualDuration" -> actualDurationHours(order);
            case "workOrder.category" -> order.getCategory() == null ? null : order.getCategory().getName();
            case "workOrder.team" -> order.getTeam() == null
                    || !belongsToWorkOrderCompany(order.getTeam().getCompany(), order) ? null : order.getTeam().getName();
            case "workOrder.completedBy" -> order.getCompletedBy() == null
                    || !belongsToWorkOrderCompany(order.getCompletedBy().getCompany(), order)
                    ? null : displayName(order.getCompletedBy());
            case "workOrder.primaryUser" -> order.getPrimaryUser() == null
                    || !belongsToWorkOrderCompany(order.getPrimaryUser().getCompany(), order)
                    ? null : displayName(order.getPrimaryUser());
            case "workOrder.customers" -> order.getCustomers() == null ? List.of()
                    : order.getCustomers().stream()
                    .filter(customer -> belongsToWorkOrderCompany(customer.getCompany(), order))
                    .map(com.grash.model.Customer::getName)
                    .filter(name -> name != null && !name.isBlank())
                    .distinct().toList();
            case "workOrder.createdBy" -> order.getCreatedBy() == null ? null
                    : userService.findById(order.getCreatedBy())
                    .filter(creator -> belongsToWorkOrderCompany(creator.getCompany(), order))
                    .map(this::displayName).orElse(null);
            case "workOrder.assignedTo" -> order.getAssignedTo() == null ? java.util.List.of()
                    : order.getAssignedTo().stream()
                    .filter(assigned -> assigned.getCompany() != null && order.getCompany() != null
                            && java.util.Objects.equals(assigned.getCompany().getId(), order.getCompany().getId()))
                    .map(this::displayName).toList();
            case "asset.name" -> order.getAsset() == null
                    || !belongsToWorkOrderCompany(order.getAsset().getCompany(), order) ? null : order.getAsset().getName();
            case "asset.serialNumber" -> order.getAsset() == null
                    || !belongsToWorkOrderCompany(order.getAsset().getCompany(), order) ? null : order.getAsset().getSerialNumber();
            case "location.name" -> order.getLocation() == null
                    || !belongsToWorkOrderCompany(order.getLocation().getCompany(), order) ? null : order.getLocation().getName();
            case "site.name" -> context.siteName();
            case "company.name" -> context.companyName();
            case "company.legalName" -> context.legalName();
            case "company.registeredAddress" -> context.registeredAddress();
            case "company.registrationNumber" -> context.registrationNumber();
            case "company.taxNumber" -> context.taxNumber();
            case "company.phone" -> context.phone();
            case "company.email" -> context.email();
            case "company.logo" -> companyLogoDataUri(order);
            case "workOrder.executionTasks" -> taskRows(order);
            case "workOrder.laborTimeEntries" -> laborRows(order);
            case "workOrder.materialsUsed" -> materialRows(order);
            case "workOrder.customFields" -> customFieldRows(order);
            case "workOrder.files" -> attachmentNames(order);
            case "workOrder.feedback" -> order.getFeedback();
            case "workOrder.signature" -> signatureDataUri(order);
            case "workOrder.comments" -> commentLines(order);
            case "workOrder.history" -> historyLines(order);
            case "workOrder.relations" -> relationLines(order);
            default -> throw new CustomException("Report field is not supported", HttpStatus.BAD_REQUEST);
        };
    }

    private List<String> commentLines(WorkOrder order) {
        if (order.getId() == null || order.getCompany() == null) return List.of();
        return commentRepository.findByWorkOrder_IdAndCompany_IdOrderByCreatedAtAscIdAsc(
                        order.getId(), order.getCompany().getId()).stream()
                .filter(comment -> comment.getWorkOrder() != null
                        && java.util.Objects.equals(comment.getWorkOrder().getId(), order.getId())
                        && belongsToWorkOrderCompany(comment.getCompany(), order)
                        && comment.getUser() != null
                        && belongsToWorkOrderCompany(comment.getUser().getCompany(), order))
                .map(this::formatCommentLine)
                .filter(line -> !line.isBlank())
                .toList();
    }

    private String formatCommentLine(Comment comment) {
        String author = displayName(comment.getUser());
        String date = iso(comment.getCreatedAt());
        String content = comment.getFormattedContent();
        StringBuilder line = new StringBuilder();
        if (date != null) line.append(date, 0, Math.min(date.length(), 10)).append(" — ");
        if (author != null && !author.isBlank()) line.append(author).append(": ");
        if (content != null) line.append(content.trim());
        return line.toString();
    }

    private List<String> historyLines(WorkOrder order) {
        if (order.getId() == null) return List.of();
        Collection<WorkOrderHistory> history = workOrderHistoryService.findByWorkOrder(order.getId());
        return history.stream()
                .filter(entry -> entry.getWorkOrder() != null
                        && java.util.Objects.equals(entry.getWorkOrder().getId(), order.getId()))
                .map(entry -> {
                    String date = iso(entry.getCreatedAt());
                    String title = entry.getName() == null ? "" : entry.getName().trim();
                    return date == null ? title : date.substring(0, Math.min(date.length(), 10)) + " — " + title;
                })
                .filter(line -> !line.isBlank())
                .toList();
    }

    private List<String> relationLines(WorkOrder order) {
        if (order.getId() == null || order.getCompany() == null
                || !licenseService.hasEntitlement(LicenseEntitlement.WORK_ORDER_LINKING)) return List.of();
        return relationService.findByWorkOrder(order.getId()).stream()
                .filter(relation -> belongsToWorkOrderCompany(relation.getCompany(), order))
                .filter(relation -> isCurrentOrderEndpoint(relation, order))
                .map(relation -> formatRelationLine(relation, order))
                .filter(line -> !line.isBlank())
                .distinct()
                .toList();
    }

    private String formatRelationLine(Relation relation, WorkOrder order) {
        boolean isParent = relation.getParent() != null
                && java.util.Objects.equals(relation.getParent().getId(), order.getId());
        WorkOrder related = isParent ? relation.getChild() : relation.getParent();
        if (related == null || java.util.Objects.equals(related.getId(), order.getId())
                || !belongsToWorkOrderCompany(related.getCompany(), order)) return "";
        RelationType type = relation.getRelationType() == null ? RelationType.RELATED_TO
                : switch (relation.getRelationType()) {
                    case BLOCKS -> isParent ? RelationType.BLOCKS : RelationType.BLOCKED_BY;
                    case DUPLICATE_OF -> isParent ? RelationType.DUPLICATE_OF : RelationType.DUPLICATED_BY;
                    case SPLIT_FROM -> isParent ? RelationType.SPLIT_FROM : RelationType.SPLIT_TO;
                    case RELATED_TO -> RelationType.RELATED_TO;
                };
        String id = related.getCustomId() == null ? String.valueOf(related.getId()) : related.getCustomId();
        String title = related.getTitle() == null ? "" : " — " + related.getTitle();
        return type + ": " + id + title;
    }

    private boolean isCurrentOrderEndpoint(Relation relation, WorkOrder order) {
        Long id = order.getId();
        return relation.getParent() != null && java.util.Objects.equals(relation.getParent().getId(), id)
                || relation.getChild() != null && java.util.Objects.equals(relation.getChild().getId(), id);
    }

    private String companyLogoDataUri(WorkOrder order) {
        if (order.getCompany() == null || order.getCompany().getLogo() == null) return null;
        File logo = order.getCompany().getLogo();
        if (logo.getCompany() == null || !java.util.Objects.equals(
                logo.getCompany().getId(), order.getCompany().getId())) return null;
        try {
            byte[] bytes = storageServiceFactory.getStorageService().download(logo);
            if (bytes == null || bytes.length == 0 || bytes.length > MAX_COMPANY_LOGO_BYTES) {
                log.warn("Company logo is empty or exceeds the report size limit; omitting from report, companyId={}",
                        order.getCompany().getId());
                return null;
            }
            String mimeType = imageMimeType(bytes);
            if (mimeType == null) {
                log.warn("Company logo is not a PNG or JPEG; omitting from report, companyId={}",
                        order.getCompany().getId());
                return null;
            }
            return "data:" + mimeType + ";base64," + Base64.getEncoder().encodeToString(bytes);
        } catch (RuntimeException exception) {
            log.warn("Company logo could not be loaded for report, companyId={}", order.getCompany().getId());
            return null;
        }
    }

    private String imageMimeType(byte[] bytes) {
        if (bytes.length >= 8 && (bytes[0] & 0xff) == 0x89 && bytes[1] == 'P'
                && bytes[2] == 'N' && bytes[3] == 'G' && bytes[4] == 0x0d
                && bytes[5] == 0x0a && bytes[6] == 0x1a && bytes[7] == 0x0a) return "image/png";
        if (bytes.length >= 3 && (bytes[0] & 0xff) == 0xff && (bytes[1] & 0xff) == 0xd8
                && (bytes[2] & 0xff) == 0xff) return "image/jpeg";
        return null;
    }

    private String signatureDataUri(WorkOrder order) {
        String value = order.getSignature();
        if (value == null || value.isBlank()) return null;
        Matcher matcher = SIGNATURE_DATA_URI.matcher(value.trim());
        if (!matcher.matches()) {
            log.warn("Stored work order signature has an unsupported image format; omitting from report, workOrderId={}",
                    order.getId());
            return null;
        }
        try {
            byte[] image = Base64.getDecoder().decode(matcher.group(2));
            if (image.length == 0 || image.length > MAX_SIGNATURE_BYTES) {
                log.warn("Stored work order signature exceeds report size limits; omitting from report, workOrderId={}",
                        order.getId());
                return null;
            }
            boolean png = "png".equalsIgnoreCase(matcher.group(1))
                    && image.length >= 8 && (image[0] & 0xff) == 0x89 && image[1] == 'P'
                    && image[2] == 'N' && image[3] == 'G';
            boolean jpeg = "jpeg".equalsIgnoreCase(matcher.group(1))
                    && image.length >= 3 && (image[0] & 0xff) == 0xff && (image[1] & 0xff) == 0xd8
                    && (image[2] & 0xff) == 0xff;
            if (!png && !jpeg) {
                log.warn("Stored work order signature does not match its declared image format; omitting from report, workOrderId={}",
                        order.getId());
                return null;
            }
            return value.trim();
        } catch (IllegalArgumentException exception) {
            log.warn("Stored work order signature is not valid base64; omitting from report, workOrderId={}",
                    order.getId());
            return null;
        }
    }

    private List<Map<String, Object>> taskRows(WorkOrder order) {
        if (order.getId() == null || order.getCompany() == null) return List.of();
        return taskService.findByWorkOrder(order.getId()).stream()
                .filter(task -> belongsToWorkOrderCompany(task.getCompany(), order))
                .filter(task -> task.getWorkOrder() != null
                        && java.util.Objects.equals(task.getWorkOrder().getId(), order.getId()))
                .filter(task -> task.getTaskBase() != null
                        && belongsToWorkOrderCompany(task.getTaskBase().getCompany(), order))
                .map(task -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("step", task.getTaskOrder() + 1);
                    row.put("task", task.getTaskBase() == null ? null : task.getTaskBase().getLabel());
                    row.put("result", task.getValue());
                    row.put("notes", task.getNotes());
                    return row;
                }).toList();
    }

    private List<Map<String, Object>> laborRows(WorkOrder order) {
        if (order.getId() == null || order.getCompany() == null
                || !licenseService.hasEntitlement(LicenseEntitlement.TIME_TRACKING)) return List.of();
        return laborService.findByWorkOrder(order.getId()).stream()
                .filter(labor -> belongsToWorkOrderCompany(labor.getCompany(), order))
                .filter(labor -> labor.getWorkOrder() != null
                        && java.util.Objects.equals(labor.getWorkOrder().getId(), order.getId()))
                .filter(labor -> labor.getAssignedTo() == null
                        || labor.getAssignedTo().getCompany() != null
                        && java.util.Objects.equals(labor.getAssignedTo().getCompany().getId(), order.getCompany().getId()))
                .filter(labor -> labor.getTimeCategory() == null
                        || labor.getTimeCategory().getCompanySettings() != null
                        && belongsToWorkOrderCompany(labor.getTimeCategory().getCompanySettings().getCompany(), order))
                .sorted(java.util.Comparator.comparing(Labor::getStartedAt,
                                java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder()))
                        .thenComparing(Labor::getId,
                                java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder())))
                .map(labor -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("technician", displayName(labor.getAssignedTo()));
                    row.put("activity", labor.getTimeCategory() == null ? null : labor.getTimeCategory().getName());
                    row.put("startedAt", iso(labor.getStartedAt()));
                    long durationSeconds = effectiveDuration(labor);
                    row.put("durationSeconds", durationSeconds);
                    row.put("durationHours", String.format(java.util.Locale.ROOT, "%.2f", durationSeconds / 3600.0));
                    row.put("status", labor.getStatus() == null ? null : labor.getStatus().name());
                    return row;
                }).toList();
    }

    /** Actual recorded labor, in hours; null means no eligible entries or no time-tracking entitlement. */
    private String actualDurationHours(WorkOrder order) {
        if (!licenseService.hasEntitlement(LicenseEntitlement.TIME_TRACKING)) return null;
        List<Map<String, Object>> rows = laborRows(order);
        if (rows.isEmpty()) return null;
        long seconds = rows.stream()
                .map(row -> row.get("durationSeconds"))
                .filter(Number.class::isInstance)
                .map(Number.class::cast)
                .mapToLong(Number::longValue)
                .sum();
        return String.format(java.util.Locale.ROOT, "%.2f", seconds / 3600.0);
    }

    private List<Map<String, Object>> materialRows(WorkOrder order) {
        if (order.getId() == null || order.getCompany() == null) return List.of();
        Collection<PartQuantity> quantities = partQuantityService.findByWorkOrder(order.getId());
        return quantities.stream()
                .filter(quantity -> belongsToWorkOrderCompany(quantity.getCompany(), order))
                .filter(quantity -> quantity.getWorkOrder() != null
                        && java.util.Objects.equals(quantity.getWorkOrder().getId(), order.getId()))
                .filter(quantity -> quantity.getPart() != null
                        && belongsToWorkOrderCompany(quantity.getPart().getCompany(), order))
                .sorted(java.util.Comparator.comparing(PartQuantity::getCreatedAt,
                                java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder()))
                        .thenComparing(PartQuantity::getId,
                                java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder())))
                .map(quantity -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("part", quantity.getPart() == null ? null : quantity.getPart().getName());
            row.put("description", quantity.getPart() == null ? null : quantity.getPart().getDescription());
            row.put("quantity", quantity.getQuantity());
            row.put("unit", quantity.getPart() == null ? null : quantity.getPart().getUnit());
            return row;
        }).toList();
    }

    private List<String> customFieldRows(WorkOrder order) {
        if (order.getCustomFieldValues() == null) return List.of();
        return order.getCustomFieldValues().stream()
                .filter(value -> value.getWorkOrder() != null
                        && java.util.Objects.equals(value.getWorkOrder().getId(), order.getId()))
                .filter(value -> value.getCustomField() != null
                        && value.getCustomField().getCompanySettings() != null
                        && value.getCustomField().getCompanySettings().getCompany() != null
                        && belongsToWorkOrderCompany(value.getCustomField().getCompanySettings().getCompany(), order))
                .filter(value -> value.getValue() != null && !value.getValue().isBlank())
                .sorted(java.util.Comparator.comparingInt(value -> value.getCustomField().getOrder()))
                .map(value -> value.getCustomField().getLabel() + ": " + value.getValue().trim())
                .toList();
    }

    private List<String> attachmentNames(WorkOrder order) {
        if (order.getFiles() == null) return List.of();
        return order.getFiles().stream()
                .filter(file -> file != null && !file.isHidden()
                        && belongsToWorkOrderCompany(file.getCompany(), order))
                .map(File::getName)
                .filter(name -> name != null && !name.isBlank())
                .distinct()
                .toList();
    }

    private boolean belongsToWorkOrderCompany(com.grash.model.Company company, WorkOrder order) {
        return company != null && order.getCompany() != null
                && java.util.Objects.equals(company.getId(), order.getCompany().getId());
    }

    private long effectiveDuration(Labor labor) {
        long duration = Math.max(0, labor.getDuration());
        if (labor.getStatus() == TimeStatus.RUNNING && labor.getStartedAt() != null) {
            long elapsed = Math.max(0, (System.currentTimeMillis() - labor.getStartedAt().getTime()) / 1000);
            return duration + elapsed;
        }
        return duration;
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
