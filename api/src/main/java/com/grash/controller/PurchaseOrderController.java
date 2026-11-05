package com.grash.controller;

import com.grash.advancedsearch.SearchCriteria;
import com.grash.dto.PurchaseOrderPatchDTO;
import com.grash.dto.PurchaseOrderCreateRequest;
import com.grash.dto.PurchaseOrderUpdateRequest;
import com.grash.dto.PartQuantityCompletePatchDTO;
import com.grash.dto.PurchaseOrderShowDTO;
import com.grash.dto.SuccessResponse;
import com.grash.exception.CustomException;
import com.grash.mapper.PartQuantityMapper;
import com.grash.mapper.PurchaseOrderMapper;
import com.grash.model.*;
import com.grash.model.enums.*;
import com.grash.model.enums.workflow.WFMainCondition;
import com.grash.model.enums.workflow.PurchaseOrderAction;
import com.grash.service.*;
import com.grash.utils.Helper;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import java.util.Collection;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Locale;
import java.util.LinkedHashMap;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneOffset;

@RestController
@RequestMapping("/purchase-orders")
@Tag(name = "Purchase Orders", description = "Operations on purchase orders")
@RequiredArgsConstructor
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;
    private final PurchaseOrderApprovalService purchaseOrderApprovalService;
    private final UserService userService;
    private final PartQuantityService partQuantityService;
    private final MessageSource messageSource;
    private final PartQuantityMapper partQuantityMapper;
    private final PurchaseOrderMapper purchaseOrderMapper;
    private final PurchaseOrderNotificationService purchaseOrderNotificationService;
    private final WorkflowService workflowService;
    private final VendorService vendorService;
    private final PurchaseOrderCategoryService purchaseOrderCategoryService;
    private final PurchaseOrderPolicyService purchaseOrderPolicyService;
    private final PartService partService;
    private final PurchaseOrderReceiptService purchaseOrderReceiptService;
    private final ProcurementApprovalService procurementApprovalService;
    private final ProcurementSiteService procurementSiteService;

    @PostMapping("/search")
    @PreAuthorize("permitAll()")
    public ResponseEntity<Page<PurchaseOrderShowDTO>> search(@Parameter(description = "Search criteria for filtering " +
                                                                     "purchase orders") @RequestBody SearchCriteria searchCriteria,
                                                             HttpServletRequest req) {
        User user = userService.whoami(req);
        purchaseOrderPolicyService.requireModuleEnabled(user);
        searchCriteria = normalizeSearchCriteria(searchCriteria);
        // The tenant boundary is server-controlled for every role; clients cannot
        // widen this query by omitting or replacing a company filter.
        searchCriteria.filterCompany(user);
        if (user.getRole().getRoleType().equals(RoleType.ROLE_CLIENT)) {
            if (user.getRole().getViewPermissions().contains(PermissionEntity.PURCHASE_ORDERS)) {
                boolean canViewOthers =
                        user.getRole().getViewOtherPermissions().contains(PermissionEntity.PURCHASE_ORDERS);
                if (!canViewOthers) {
                    searchCriteria.filterCreatedBy(user);
                }
            } else throw new CustomException("Access Denied", HttpStatus.FORBIDDEN);
        }
        return ResponseEntity.ok(purchaseOrderService.findBySearchCriteria(searchCriteria, user).map(this::setPartQuantities));
    }

    static SearchCriteria normalizeSearchCriteria(SearchCriteria criteria) {
        SearchCriteria normalized = criteria == null ? new SearchCriteria() : criteria;
        if (normalized.getFilterFields() == null) normalized.setFilterFields(new ArrayList<>());
        normalized.setPageNum(Math.max(0, normalized.getPageNum()));
        normalized.setPageSize(Math.max(1, Math.min(normalized.getPageSize(), 100)));
        if (normalized.getDirection() == null) normalized.setDirection(Sort.Direction.DESC);
        if (normalized.getSortField() == null || normalized.getSortField().isBlank()) {
            normalized.setSortField("id");
        }
        return normalized;
    }

    @GetMapping("/receiving-queue")
    @PreAuthorize("permitAll()")
    @Transactional(readOnly = true)
    public Page<PurchaseOrderShowDTO> receivingQueue(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "ALL") String receiptState,
            HttpServletRequest req) {
        User user = userService.whoami(req);
        if (!user.getRole().getViewPermissions().contains(PermissionEntity.PURCHASE_ORDERS)) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
        purchaseOrderPolicyService.requireModuleEnabled(user);
        boolean includeOthers = user.getRole().getViewOtherPermissions()
                .contains(PermissionEntity.PURCHASE_ORDERS);
        // Put the most time-sensitive commitments first. PostgreSQL's explicit
        // NULLS LAST keeps undated orders behind orders with a delivery promise.
        Sort queueSort = Sort.by(Sort.Order.asc("shippingDueDate").nullsLast(),
                Sort.Order.desc("id"));
        PageRequest pageable = PageRequest.of(Math.max(0, page), Math.max(1, Math.min(size, 50)), queueSort);
        String normalizedReceiptState = receiptState == null ? "ALL" : receiptState.trim().toUpperCase(Locale.ROOT);
        if (!List.of("ALL", "NOT_STARTED", "PARTIAL").contains(normalizedReceiptState)) {
            throw new CustomException("Invalid receipt state", HttpStatus.BAD_REQUEST);
        }
        return purchaseOrderService.findReceivable(user.getCompany().getId(), includeOthers,
                user.getId(), procurementSiteService.canAccessAllSites(user),
                procurementSiteService.siteIdsForQuery(user), normalizeQueueQuery(query), normalizedReceiptState, pageable)
                .map(order -> setPartQuantities(purchaseOrderMapper.toShowDto(order)));
    }

    private String normalizeQueueQuery(String query) {
        if (query == null || query.isBlank()) return null;
        String normalized = query.trim();
        return normalized.length() > 100 ? normalized.substring(0, 100) : normalized;
    }

    @GetMapping("/{id}")
    @PreAuthorize("permitAll()")
    public PurchaseOrderShowDTO getById(@PathVariable("id") Long id, HttpServletRequest req) {
        User user = userService.whoami(req);
        purchaseOrderPolicyService.requireModuleEnabled(user);
        Optional<PurchaseOrder> optionalPurchaseOrder = purchaseOrderService.findByIdAndCompany_Id(
                id, user.getCompany().getId());
        if (optionalPurchaseOrder.isPresent()) {
            PurchaseOrder savedPurchaseOrder = optionalPurchaseOrder.get();
            requireSiteAccess(savedPurchaseOrder, user);
            if (savedPurchaseOrder.canBeViewedBy(user)) {
                return setPartQuantities(purchaseOrderMapper.toShowDto(savedPurchaseOrder));
            } else throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        } else throw new CustomException("Not found", HttpStatus.NOT_FOUND);
    }

    @PostMapping("")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    PurchaseOrderShowDTO create(@Parameter(description = "Purchase order data to create") @Valid @RequestBody PurchaseOrder purchaseOrderReq,
                                HttpServletRequest req) {
        User user = userService.whoami(req);
        if (user.getRole().getCreatePermissions().contains(PermissionEntity.PURCHASE_ORDERS)) {
            purchaseOrderPolicyService.requireModuleEnabled(user);
            // Legacy single-document API remains on its historical approval/inventory semantics.
            purchaseOrderReq.setReceivingWorkflowEnabled(false);
            purchaseOrderReq.setVendor(resolveVendor(purchaseOrderReq.getVendor(), user));
            purchaseOrderReq.setCategory(resolveCategory(purchaseOrderReq.getCategory(), user));
            PurchaseOrder savedPurchaseOrder = purchaseOrderService.create(purchaseOrderReq);
            PurchaseOrderShowDTO result = setPartQuantities(purchaseOrderMapper.toShowDto(savedPurchaseOrder));
            var savedLines = partQuantityService.findByPurchaseOrder(savedPurchaseOrder.getId());
            java.math.BigDecimal estimatedAmount = ProcurementApprovalService.estimatePurchaseOrderAmount(savedLines);
            String currency = user.getCompany().getCompanySettings().getGeneralPreferences().getCurrency().getCode();
            procurementApprovalService.start("PO", savedPurchaseOrder.getId(), savedPurchaseOrder.getName(),
                    savedPurchaseOrder.getCreatedBy(), savedPurchaseOrder.getCompany(), estimatedAmount, currency);
            runPurchaseOrderWorkflows(WFMainCondition.PURCHASE_ORDER_CREATED, savedPurchaseOrder,
                    user.getCompany().getId());
            purchaseOrderNotificationService.notifyCreatedAfterCommit(result, user, estimatedAmount, currency);
            return result;
        } else throw new

                CustomException("Access denied", HttpStatus.FORBIDDEN);

    }

    @PostMapping("/with-lines")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public PurchaseOrderShowDTO createWithLines(@Valid @RequestBody PurchaseOrderCreateRequest request,
                                                HttpServletRequest req) {
        User user = userService.whoami(req);
        if (!user.getRole().getCreatePermissions().contains(PermissionEntity.PURCHASE_ORDERS)) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
        purchaseOrderPolicyService.requireModuleEnabled(user);
        if (request.getPartQuantities() == null || request.getPartQuantities().isEmpty()) {
            throw new CustomException("At least one purchase order line is required", HttpStatus.BAD_REQUEST);
        }

        PurchaseOrder purchaseOrder = request.getPurchaseOrder();
        purchaseOrder.setReceivingWorkflowEnabled(true);
        purchaseOrder.setVendor(resolveVendor(purchaseOrder.getVendor(), user));
        purchaseOrder.setCategory(resolveCategory(purchaseOrder.getCategory(), user));
        PurchaseOrder saved = purchaseOrderService.create(purchaseOrder);

        var lines = request.getPartQuantities();
        if (lines.stream().anyMatch(line -> line.getPart() == null || line.getPart().getId() == null)) {
            throw new CustomException("Part IDs are required", HttpStatus.BAD_REQUEST);
        }
        if (lines.stream().map(line -> line.getPart().getId()).distinct().count() != lines.size()) {
            throw new CustomException("A part can only be associated once", HttpStatus.BAD_REQUEST);
        }
        for (var line : lines) {
            double quantity = line.getQuantity();
            if (!Double.isFinite(quantity) || quantity <= 0) {
                throw new CustomException("Purchase order quantity must be greater than zero", HttpStatus.BAD_REQUEST);
            }
            Part part = partService.findByIdAndCompany(line.getPart().getId(), user.getCompany().getId())
                    .orElseThrow(() -> new CustomException("Part not found", HttpStatus.NOT_FOUND));
            if (part.getUnit() == null && quantity != Math.rint(quantity)) {
                throw new CustomException("A whole quantity is required when the part has no unit",
                        HttpStatus.BAD_REQUEST);
            }
            PartQuantity orderLine = new PartQuantity(part, null, saved, quantity);
            orderLine.setSite(procurementSiteService.resolveLineSite(line.getSiteId(), null, user));
            setAgreedPrice(orderLine, line.getPurchaseUnitPrice());
            partQuantityService.create(orderLine);
        }

        var savedLines = partQuantityService.findByPurchaseOrder(saved.getId());
        java.math.BigDecimal estimatedAmount = ProcurementApprovalService.estimatePurchaseOrderAmount(savedLines);
        String currency = user.getCompany().getCompanySettings().getGeneralPreferences().getCurrency().getCode();
        procurementApprovalService.start("PO", saved.getId(), saved.getName(), saved.getCreatedBy(),
                saved.getCompany(), estimatedAmount, currency);
        runPurchaseOrderWorkflows(WFMainCondition.PURCHASE_ORDER_CREATED, saved, user.getCompany().getId());
        if (request.isApproveOnSubmit() && saved.getStatus() == ApprovalStatus.PENDING
                && !procurementApprovalService.isGoverned("PO", saved.getId(), user.getCompany().getId())) {
            if (!user.getRole().getEditOtherPermissions().contains(PermissionEntity.PURCHASE_ORDER_APPROVAL)) {
                throw new CustomException("Forbidden", HttpStatus.FORBIDDEN);
            }
            purchaseOrderApprovalService.respond(saved.getId(), user.getCompany().getId(), true, user, null, true);
        }

        PurchaseOrderShowDTO result = setPartQuantities(purchaseOrderMapper.toShowDto(saved));
        purchaseOrderNotificationService.notifyCreatedAfterCommit(result, user, estimatedAmount, currency);
        return result;
    }

    /** Imports POs through the standard creation flow so approval workflows start normally. */
    @PostMapping(value = "/import", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public Map<String, Object> importCsv(@RequestParam("file") MultipartFile file, HttpServletRequest request) throws Exception {
        if (file.isEmpty() || file.getSize() > 10 * 1024 * 1024) throw new CustomException("purchase_import_file_invalid", HttpStatus.BAD_REQUEST);
        User user = userService.whoami(request);
        if (!user.getRole().getCreatePermissions().contains(PermissionEntity.PURCHASE_ORDERS)) throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        purchaseOrderPolicyService.requireModuleEnabled(user);
        LinkedHashMap<String, ImportedPurchaseOrder> orders = new LinkedHashMap<>();
        String csv = new String(file.getBytes(), StandardCharsets.UTF_8).replace("\uFEFF", "");
        try (CSVParser parser = CSVFormat.DEFAULT.withFirstRecordAsHeader().withIgnoreEmptyLines(true).parse(new StringReader(csv))) {
            Set<String> requiredHeaders = Set.of("purchaseOrderKey", "name", "vendorId", "categoryId", "shippingDueDate", "additionalInfoNotes", "partId", "quantity", "purchaseUnitPrice");
            if (!parser.getHeaderMap().keySet().containsAll(requiredHeaders)) throw new CustomException("purchase_import_headers_invalid", HttpStatus.BAD_REQUEST);
            int rowNumber = 1;
            for (CSVRecord row : parser) {
                rowNumber++;
                if (rowNumber > 5001) throw new CustomException("purchase_import_row_limit_exceeded", HttpStatus.BAD_REQUEST);
                try {
                    String key = csvRequired(row, "purchaseOrderKey");
                    ImportedPurchaseOrder item = orders.computeIfAbsent(key, ignored -> new ImportedPurchaseOrder(row));
                    item.assertSameHeader(row);
                    long partId = Long.parseLong(csvRequired(row, "partId"));
                    double quantity = Double.parseDouble(csvRequired(row, "quantity"));
                    if (!Double.isFinite(quantity) || quantity <= 0) throw new IllegalArgumentException("quantity_invalid");
                    java.math.BigDecimal unitPrice = new java.math.BigDecimal(csvRequired(row, "purchaseUnitPrice"));
                    if (unitPrice.signum() < 0 || unitPrice.scale() > 4 || unitPrice.precision() > 19) throw new IllegalArgumentException("purchase_unit_price_invalid");
                    Long siteId = csvOptional(row, "siteId").isBlank() ? null : Long.valueOf(csvOptional(row, "siteId"));
                    item.addLine(partId, quantity, unitPrice, siteId);
                } catch (RuntimeException error) {
                    throw new CustomException("purchase_import_invalid_row_" + rowNumber + "_" + safeCsvMessage(error), HttpStatus.UNPROCESSABLE_ENTITY);
                }
            }
        }
        if (orders.isEmpty()) throw new CustomException("purchase_import_empty", HttpStatus.BAD_REQUEST);
        if (orders.size() > 100) throw new CustomException("purchase_import_document_limit_exceeded", HttpStatus.BAD_REQUEST);
        for (ImportedPurchaseOrder imported : orders.values()) {
            if (imported.linesByPart.isEmpty()) throw new CustomException("purchase_import_empty_lines", HttpStatus.UNPROCESSABLE_ENTITY);
            PurchaseOrder order = new PurchaseOrder();
            order.setName(imported.name);
            order.setAdditionalInfoNotes(imported.notes);
            order.setShippingDueDate(imported.shippingDueDate == null ? null : java.util.Date.from(imported.shippingDueDate.atStartOfDay().toInstant(ZoneOffset.UTC)));
            if (imported.vendorId != null) { Vendor vendor = new Vendor(); vendor.setId(imported.vendorId); order.setVendor(vendor); }
            if (imported.categoryId != null) { PurchaseOrderCategory category = new PurchaseOrderCategory(); category.setId(imported.categoryId); order.setCategory(category); }
            PurchaseOrderCreateRequest dto = new PurchaseOrderCreateRequest();
            dto.setPurchaseOrder(order); dto.setPartQuantities(new ArrayList<>(imported.linesByPart.values())); dto.setApproveOnSubmit(false);
            createWithLines(dto, request); // Reuses validation, scoped references, notifications, and approval startup.
        }
        return Map.of("importedPurchaseOrders", orders.size(), "createdAs", "PENDING_APPROVAL");
    }

    private static String csvOptional(CSVRecord row, String name) { return !row.isMapped(name) || row.get(name) == null ? "" : row.get(name).trim(); }
    private static String csvRequired(CSVRecord row, String name) { String value = csvOptional(row, name); if (value.isBlank()) throw new IllegalArgumentException(name + "_required"); return value; }
    private static LocalDate csvDate(CSVRecord row, String name) { String value = csvOptional(row, name); return value.isBlank() ? null : LocalDate.parse(value.substring(0, Math.min(10, value.length()))); }
    private static String safeCsvMessage(RuntimeException error) { return (error.getMessage() == null ? "invalid" : error.getMessage()).replaceAll("[^a-zA-Z0-9_-]", "_"); }
    private static final class ImportedPurchaseOrder {
        final String name, notes; final Long vendorId, categoryId; final LocalDate shippingDueDate;
        final Map<Long, PartQuantityCompletePatchDTO> linesByPart = new LinkedHashMap<>();
        ImportedPurchaseOrder(CSVRecord row) {
            name = csvRequired(row, "name"); notes = csvOptional(row, "additionalInfoNotes");
            vendorId = csvOptional(row, "vendorId").isBlank() ? null : Long.valueOf(csvOptional(row, "vendorId"));
            categoryId = csvOptional(row, "categoryId").isBlank() ? null : Long.valueOf(csvOptional(row, "categoryId"));
            shippingDueDate = csvDate(row, "shippingDueDate");
        }
        void addLine(long partId, double quantity, java.math.BigDecimal unitPrice, Long siteId) {
            PartQuantityCompletePatchDTO line = linesByPart.get(partId);
            if (line == null) {
                line = new PartQuantityCompletePatchDTO();
                Part part = new Part(); part.setId(partId); line.setPart(part);
                linesByPart.put(partId, line);
                line.setPurchaseUnitPrice(unitPrice);
                line.setSiteId(siteId);
            } else if (line.getPurchaseUnitPrice().compareTo(unitPrice) != 0) {
                throw new IllegalArgumentException("purchase_unit_price_mismatch_for_duplicate_part");
            } else if (!Objects.equals(line.getSiteId(), siteId)) {
                throw new IllegalArgumentException("purchase_site_mismatch_for_duplicate_part");
            }
            line.setQuantity(line.getQuantity() + quantity);
        }
        void assertSameHeader(CSVRecord row) {
            if (!name.equals(csvRequired(row, "name")) || !notes.equals(csvOptional(row, "additionalInfoNotes"))
                    || !Objects.equals(vendorId, csvOptional(row, "vendorId").isBlank() ? null : Long.valueOf(csvOptional(row, "vendorId")))
                    || !Objects.equals(categoryId, csvOptional(row, "categoryId").isBlank() ? null : Long.valueOf(csvOptional(row, "categoryId")))
                    || !Objects.equals(shippingDueDate, csvDate(row, "shippingDueDate")))
                throw new IllegalArgumentException("purchase_order_header_mismatch");
        }
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public PurchaseOrderShowDTO patch(@Parameter(description = "Purchase order fields to update") @Valid @RequestBody PurchaseOrderPatchDTO purchaseOrder,
                                      @PathVariable("id") Long id,
                                      HttpServletRequest req) {
        User user = userService.whoami(req);
        Optional<PurchaseOrder> optionalPurchaseOrder = purchaseOrderService.findByIdForUpdateAndCompany(
                id, user.getCompany().getId());

        if (optionalPurchaseOrder.isPresent()) {
            PurchaseOrder savedPurchaseOrder = optionalPurchaseOrder.get();
            requireSiteAccess(savedPurchaseOrder, user);
            if (!savedPurchaseOrder.canBeEditedBy(user)) {
                throw new CustomException("Forbidden", HttpStatus.FORBIDDEN);
            }
            procurementApprovalService.requireEditable("PO", id, user.getCompany().getId());
            purchaseOrderPolicyService.requireModuleEnabled(user);
            if (savedPurchaseOrder.getStatus() == ApprovalStatus.APPROVED) {
                throw new CustomException("Approved purchase orders cannot be changed", HttpStatus.CONFLICT);
            }
            purchaseOrder.setVendor(resolveVendor(purchaseOrder.getVendor(), user));
            purchaseOrder.setCategory(resolveCategory(purchaseOrder.getCategory(), user));
            PurchaseOrder patchedPurchaseOrder = purchaseOrderService.update(id,
                    user.getCompany().getId(), purchaseOrder);
            runPurchaseOrderWorkflows(WFMainCondition.PURCHASE_ORDER_UPDATED, patchedPurchaseOrder,
                    user.getCompany().getId());
            return setPartQuantities(purchaseOrderMapper.toShowDto(patchedPurchaseOrder));
        } else throw new CustomException("PurchaseOrder not found", HttpStatus.NOT_FOUND);
    }

    @PatchMapping("/{id}/with-lines")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public PurchaseOrderShowDTO patchWithLines(@PathVariable("id") Long id,
                                               @Valid @RequestBody PurchaseOrderUpdateRequest request,
                                               HttpServletRequest req) {
        User user = userService.whoami(req);
        PurchaseOrder saved = purchaseOrderService.findByIdForUpdateAndCompany(id, user.getCompany().getId())
                .orElseThrow(() -> new CustomException("PurchaseOrder not found", HttpStatus.NOT_FOUND));
        requireSiteAccess(saved, user);
        if (!saved.canBeEditedBy(user)) throw new CustomException("Forbidden", HttpStatus.FORBIDDEN);
        procurementApprovalService.requireEditable("PO", id, user.getCompany().getId());
        purchaseOrderPolicyService.requireModuleEnabled(user);
        if (saved.getStatus() == ApprovalStatus.APPROVED) {
            throw new CustomException("Approved purchase orders cannot be changed", HttpStatus.CONFLICT);
        }
        ensureNoRequisitionSourcedLines(saved, user);

        List<PartQuantityCompletePatchDTO> requestedLines = request.getPartQuantities();
        if (requestedLines == null || requestedLines.isEmpty()) {
            throw new CustomException("At least one purchase order line is required", HttpStatus.BAD_REQUEST);
        }
        if (requestedLines.stream().anyMatch(line -> line.getPart() == null || line.getPart().getId() == null)) {
            throw new CustomException("Part IDs are required", HttpStatus.BAD_REQUEST);
        }
        if (requestedLines.stream().map(line -> line.getPart().getId()).distinct().count() != requestedLines.size()) {
            throw new CustomException("A part can only be associated once", HttpStatus.BAD_REQUEST);
        }
        Map<Long, Part> requestedParts = new HashMap<>();
        for (var line : requestedLines) {
            double quantity = line.getQuantity();
            if (!Double.isFinite(quantity) || quantity <= 0) {
                throw new CustomException("Purchase order quantity must be greater than zero", HttpStatus.BAD_REQUEST);
            }
            Long partId = line.getPart().getId();
            Part part = partService.findByIdAndCompany(partId, user.getCompany().getId())
                    .orElseThrow(() -> new CustomException("Part not found", HttpStatus.NOT_FOUND));
            if (part.getUnit() == null && quantity != Math.rint(quantity)) {
                throw new CustomException("A whole quantity is required when the part has no unit",
                        HttpStatus.BAD_REQUEST);
            }
            if (line.getPurchaseUnitPrice() != null && (line.getPurchaseUnitPrice().signum() < 0
                    || line.getPurchaseUnitPrice().scale() > 4 || line.getPurchaseUnitPrice().precision() > 19)) {
                throw new CustomException("A valid supplier unit price with at most four decimals is required", HttpStatus.BAD_REQUEST);
            }
            requestedParts.put(partId, part);
        }

        PurchaseOrderPatchDTO purchaseOrderPatch = request.getPurchaseOrder();
        purchaseOrderPatch.setVendor(resolveVendor(purchaseOrderPatch.getVendor(), user));
        purchaseOrderPatch.setCategory(resolveCategory(purchaseOrderPatch.getCategory(), user));
        PurchaseOrder updated = purchaseOrderService.update(id, user.getCompany().getId(), purchaseOrderPatch);
        replacePurchaseOrderLines(updated, requestedLines, requestedParts, user);

        runPurchaseOrderWorkflows(WFMainCondition.PURCHASE_ORDER_UPDATED, updated, user.getCompany().getId());
        return setPartQuantities(purchaseOrderMapper.toShowDto(updated));
    }

    private void replacePurchaseOrderLines(PurchaseOrder purchaseOrder,
                                           List<PartQuantityCompletePatchDTO> requestedLines,
                                           Map<Long, Part> requestedParts,
                                           User user) {
        Collection<PartQuantity> existingLines = partQuantityService.findByPurchaseOrder(purchaseOrder.getId());
        Map<Long, PartQuantity> existingByPartId = existingLines.stream().collect(Collectors.toMap(
                line -> line.getPart().getId(), line -> line));
        HashSet<Long> requestedPartIds = new HashSet<>();
        for (var requested : requestedLines) {
            Long partId = requested.getPart().getId();
            requestedPartIds.add(partId);
            PartQuantity existing = existingByPartId.get(partId);
            if (existing != null) {
                existing.setQuantity(requested.getQuantity());
                existing.setSite(procurementSiteService.resolveLineSite(requested.getSiteId(), existing.getSite(), user));
                if (requested.getPurchaseUnitPrice() != null) setAgreedPrice(existing, requested.getPurchaseUnitPrice());
                partQuantityService.save(existing);
            } else {
                PartQuantity created = new PartQuantity(requestedParts.get(partId), null, purchaseOrder,
                        requested.getQuantity());
                created.setSite(procurementSiteService.resolveLineSite(requested.getSiteId(), null, user));
                setAgreedPrice(created, requested.getPurchaseUnitPrice());
                partQuantityService.create(created);
            }
        }
        existingByPartId.forEach((partId, existing) -> {
            if (!requestedPartIds.contains(partId)) partQuantityService.delete(existing);
        });
    }

    private void setAgreedPrice(PartQuantity line, java.math.BigDecimal amount) {
        try { partQuantityService.setAgreedPurchasePrice(line, amount); }
        catch (IllegalArgumentException ex) {
            throw new CustomException("A valid supplier unit price with at most four decimals is required", HttpStatus.BAD_REQUEST);
        }
    }

    private void runPurchaseOrderWorkflows(WFMainCondition condition, PurchaseOrder purchaseOrder, Long companyId) {
        boolean requisitionSourced = hasRequisitionSourcedLines(purchaseOrder);
        boolean governed = procurementApprovalService.isGoverned("PO", purchaseOrder.getId(), companyId);
        workflowService.findByMainConditionAndCompany(condition, companyId).stream()
                .filter(Workflow::isEnabled)
                .filter(workflow -> !governed
                        || workflow.getAction() == null
                        || workflow.getAction().getPurchaseOrderAction() == null
                        || (workflow.getAction().getPurchaseOrderAction() != PurchaseOrderAction.APPROVE
                        && workflow.getAction().getPurchaseOrderAction() != PurchaseOrderAction.REJECT))
                .filter(workflow -> !requisitionSourced
                        || workflow.getAction() == null
                        || workflow.getAction().getPurchaseOrderAction() == null
                        || (workflow.getAction().getPurchaseOrderAction() != PurchaseOrderAction.APPROVE
                        && workflow.getAction().getPurchaseOrderAction() != PurchaseOrderAction.REJECT))
                .forEach(workflow -> workflowService.runPurchaseOrder(workflow, purchaseOrder));
    }

    private boolean hasRequisitionSourcedLines(PurchaseOrder purchaseOrder) {
        return partQuantityService.findByPurchaseOrder(purchaseOrder.getId()).stream()
                .anyMatch(line -> line.getRequisitionLine() != null);
    }

    private void requireSiteAccess(PurchaseOrder purchaseOrder, User user) {
        boolean accessible = partQuantityService.findByPurchaseOrder(purchaseOrder.getId()).stream()
                .allMatch(line -> procurementSiteService.canAccessSite(user, line.getSite()));
        if (!accessible) throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
    }

    @PatchMapping("/{id}/respond")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public PurchaseOrderShowDTO respond(@Parameter(description = "Whether the purchase order is approved") @RequestParam("approved") boolean approved, @PathVariable("id") Long id,
                                        HttpServletRequest req) {
        User user = userService.whoami(req);
        if (!user.getRole().getEditOtherPermissions().contains(PermissionEntity.PURCHASE_ORDER_APPROVAL)) {
            throw new CustomException("Forbidden", HttpStatus.FORBIDDEN);
        }
        purchaseOrderPolicyService.requireModuleEnabled(user);
        PurchaseOrder currentOrder = purchaseOrderService.findByIdAndCompany_Id(id, user.getCompany().getId())
                .orElseThrow(() -> new CustomException("PurchaseOrder not found", HttpStatus.NOT_FOUND));
        requireSiteAccess(currentOrder, user);
        PurchaseOrder respondedPurchaseOrder = purchaseOrderApprovalService.respond(
                id, user.getCompany().getId(), approved, user, req.getParameter("comment"));
        return setPartQuantities(purchaseOrderMapper.toShowDto(respondedPurchaseOrder));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public ResponseEntity delete(@PathVariable("id") Long id, HttpServletRequest req) {
        User user = userService.whoami(req);

        Optional<PurchaseOrder> optionalPurchaseOrder = purchaseOrderService.findByIdForUpdateAndCompany(
                id, user.getCompany().getId());
        if (optionalPurchaseOrder.isPresent()) {
            PurchaseOrder savedPurchaseOrder = optionalPurchaseOrder.get();
            requireSiteAccess(savedPurchaseOrder, user);
            if (savedPurchaseOrder.canBeDeletedBy(user)) {
                purchaseOrderPolicyService.requireModuleEnabled(user);
                procurementApprovalService.requireEditable("PO", id, user.getCompany().getId());
                if (savedPurchaseOrder.getStatus() == ApprovalStatus.APPROVED) {
                    throw new CustomException(messageSource.getMessage("purchase_order_cancel_unavailable",
                            null, Helper.getLocale(user)),
                            HttpStatus.CONFLICT);
                }
                ensureNoRequisitionSourcedLines(savedPurchaseOrder, user);
                if (purchaseOrderReceiptService.hasReceipts(id)) {
                    throw new CustomException(messageSource.getMessage("purchase_order_receipt_cancel_unavailable",
                            null, Helper.getLocale(user)),
                            HttpStatus.CONFLICT);
                }
                purchaseOrderService.delete(id, user.getCompany().getId());
                return new ResponseEntity(new SuccessResponse(true, "Deleted successfully"),
                        HttpStatus.OK);
            } else throw new CustomException("Forbidden", HttpStatus.FORBIDDEN);
        } else throw new CustomException("PurchaseOrder not found", HttpStatus.NOT_FOUND);
    }

    private PurchaseOrderShowDTO setPartQuantities(PurchaseOrderShowDTO purchaseOrderShowDTO) {
        Collection<PartQuantity> partQuantities = partQuantityService.findByPurchaseOrder(purchaseOrderShowDTO.getId());
        Map<Long, Double> receivedByLine = purchaseOrderShowDTO.isReceivingWorkflowEnabled()
                ? purchaseOrderReceiptService.receivedByLine(purchaseOrderShowDTO.getId()) : Map.of();
        purchaseOrderShowDTO.setPartQuantities(partQuantities.stream().map(line -> {
            var dto = partQuantityMapper.toShowDto(line);
            double received = receivedByLine.getOrDefault(line.getId(), 0d);
            dto.setReceivedQuantity(received);
            dto.setRemainingToReceive(Math.max(0, line.getQuantity() - received));
            return dto;
        }).collect(Collectors.toList()));
        return purchaseOrderShowDTO;
    }

    private void ensureNoRequisitionSourcedLines(PurchaseOrder purchaseOrder, User user) {
        if (partQuantityService.findByPurchaseOrder(purchaseOrder.getId()).stream()
                .anyMatch(line -> line.getRequisitionLine() != null)) {
            throw new CustomException(messageSource.getMessage("purchase_order_requisition_edit_unavailable",
                    null, Helper.getLocale(user)),
                    HttpStatus.CONFLICT);
        }
    }

    private Vendor resolveVendor(Vendor vendor, User user) {
        if (vendor == null) return null;
        if (vendor.getId() == null) throw new CustomException("Vendor not found", HttpStatus.BAD_REQUEST);
        return vendorService.findByIdAndCompany(vendor.getId(), user.getCompany().getId())
                .orElseThrow(() -> new CustomException("Vendor not found", HttpStatus.BAD_REQUEST));
    }

    private PurchaseOrderCategory resolveCategory(PurchaseOrderCategory category, User user) {
        if (category == null) return null;
        if (category.getId() == null) throw new CustomException("Purchase order category not found", HttpStatus.BAD_REQUEST);
        return purchaseOrderCategoryService.findByIdAndCompanySettings(
                        category.getId(), user.getCompany().getCompanySettings().getId())
                .orElseThrow(() -> new CustomException("Purchase order category not found", HttpStatus.BAD_REQUEST));
    }

}


