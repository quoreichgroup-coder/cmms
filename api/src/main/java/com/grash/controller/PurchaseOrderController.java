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
import com.grash.factory.MailServiceFactory;
import com.grash.model.*;
import com.grash.model.enums.*;
import com.grash.model.enums.workflow.WFMainCondition;
import com.grash.model.enums.workflow.PurchaseOrderAction;
import com.grash.service.*;
import com.grash.utils.Helper;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/purchase-orders")
@Tag(name = "Purchase Orders", description = "Operations on purchase orders")
@RequiredArgsConstructor
@Slf4j
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;
    private final PurchaseOrderApprovalService purchaseOrderApprovalService;
    private final UserService userService;
    private final PartQuantityService partQuantityService;
    private final MessageSource messageSource;
    private final PartQuantityMapper partQuantityMapper;
    private final PurchaseOrderMapper purchaseOrderMapper;
    private final MailServiceFactory mailServiceFactory;
    private final NotificationService notificationService;
    private final WorkflowService workflowService;
    private final VendorService vendorService;
    private final PurchaseOrderCategoryService purchaseOrderCategoryService;
    private final PurchaseOrderPolicyService purchaseOrderPolicyService;
    private final PartService partService;
    private final PurchaseOrderReceiptService purchaseOrderReceiptService;

    @Value("${frontend.url}")
    private String frontendUrl;

    @PostMapping("/search")
    @PreAuthorize("permitAll()")
    public ResponseEntity<Page<PurchaseOrderShowDTO>> search(@Parameter(description = "Search criteria for filtering " +
                                                                     "purchase orders") @RequestBody SearchCriteria searchCriteria,
                                                             HttpServletRequest req) {
        User user = userService.whoami(req);
        if (user.getRole().getRoleType().equals(RoleType.ROLE_CLIENT)) {
            if (user.getRole().getViewPermissions().contains(PermissionEntity.PURCHASE_ORDERS)) {
                searchCriteria.filterCompany(user);
                boolean canViewOthers =
                        user.getRole().getViewOtherPermissions().contains(PermissionEntity.PURCHASE_ORDERS);
                if (!canViewOthers) {
                    searchCriteria.filterCreatedBy(user);
                }
            } else throw new CustomException("Access Denied", HttpStatus.FORBIDDEN);
        }
        return ResponseEntity.ok(purchaseOrderService.findBySearchCriteria(searchCriteria).map(this::setPartQuantities));
    }

    @GetMapping("/receiving-queue")
    @PreAuthorize("permitAll()")
    @Transactional(readOnly = true)
    public Page<PurchaseOrderShowDTO> receivingQueue(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            HttpServletRequest req) {
        User user = userService.whoami(req);
        if (!user.getRole().getViewPermissions().contains(PermissionEntity.PURCHASE_ORDERS)) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
        purchaseOrderPolicyService.requireModuleEnabled(user);
        boolean includeOthers = user.getRole().getViewOtherPermissions()
                .contains(PermissionEntity.PURCHASE_ORDERS);
        PageRequest pageable = PageRequest.of(Math.max(0, page), Math.max(1, Math.min(size, 50)),
                Sort.by(Sort.Direction.DESC, "id"));
        return purchaseOrderService.findReceivable(user.getCompany().getId(), includeOthers,
                user.getId(), pageable).map(order -> setPartQuantities(purchaseOrderMapper.toShowDto(order)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("permitAll()")
    public PurchaseOrderShowDTO getById(@PathVariable("id") Long id, HttpServletRequest req) {
        User user = userService.whoami(req);
        Optional<PurchaseOrder> optionalPurchaseOrder = purchaseOrderService.findByIdAndCompany_Id(
                id, user.getCompany().getId());
        if (optionalPurchaseOrder.isPresent()) {
            PurchaseOrder savedPurchaseOrder = optionalPurchaseOrder.get();
            if (savedPurchaseOrder.canBeViewedBy(user)) {
                return setPartQuantities(purchaseOrderMapper.toShowDto(savedPurchaseOrder));
            } else throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        } else throw new CustomException("Not found", HttpStatus.NOT_FOUND);
    }

    @PostMapping("")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
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
            runPurchaseOrderWorkflows(WFMainCondition.PURCHASE_ORDER_CREATED, savedPurchaseOrder,
                    user.getCompany().getId());
            PurchaseOrderShowDTO result = setPartQuantities(purchaseOrderMapper.toShowDto(savedPurchaseOrder));
            double cost =
                    result.getPartQuantities().stream().mapToDouble(partQuantityShowDTO -> partQuantityShowDTO.getQuantity() * partQuantityShowDTO.getPart().getCost()).sum();
            String title = messageSource.getMessage("new_po", null, Helper.getLocale(user));
            String message = messageSource.getMessage("notification_new_po_request", new Object[]{result.getName(),
                            cost,
                            user.getCompany().getCompanySettings().getGeneralPreferences().getCurrency().getCode()},
                    Helper.getLocale(user));
            Map<String, Object> mailVariables = new HashMap<String, Object>() {{
                put("purchaseOrderLink", frontendUrl + "/app/purchase-orders/" + result.getId());
                put("message", message);
            }};
            Collection<User> usersToNotify = userService.findByCompany(user.getCompany().getId()).stream()
                    .filter(user1 -> user1.isEnabled() &&
                            (user1.getRole().getViewPermissions().contains(PermissionEntity.SETTINGS) ||
                                    user1.getRole().getCode().equals(RoleCode.LIMITED_ADMIN)))
                    .collect(Collectors.toList());
            notificationService.createMultiple(usersToNotify.stream().map(user1 -> new Notification(message, user1,
                    NotificationType.PURCHASE_ORDER, result.getId())).collect(Collectors.toList()), true, title);
            Collection<User> usersToMail =
                    usersToNotify.stream().filter(user1 -> user1.getUserSettings().shouldEmailUpdatesForPurchaseOrders()).collect(Collectors.toList());
            mailServiceFactory.getMailService().sendMessageUsingThymeleafTemplate(usersToMail.stream().map(User::getEmail).toArray(String[]::new), messageSource.getMessage("new_po", null, Helper.getLocale(user)), mailVariables, "new-purchase-order.html", Helper.getLocale(user), null);
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
            partQuantityService.create(new PartQuantity(part, null, saved, quantity));
        }

        runPurchaseOrderWorkflows(WFMainCondition.PURCHASE_ORDER_CREATED, saved, user.getCompany().getId());
        if (request.isApproveOnSubmit() && saved.getStatus() == ApprovalStatus.PENDING) {
            if (!user.getRole().getEditOtherPermissions().contains(PermissionEntity.PURCHASE_ORDERS)) {
                throw new CustomException("Forbidden", HttpStatus.FORBIDDEN);
            }
            purchaseOrderApprovalService.respond(saved.getId(), user.getCompany().getId(), true);
        }

        PurchaseOrderShowDTO result = setPartQuantities(purchaseOrderMapper.toShowDto(saved));
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    try {
                        notifyPurchaseOrderCreated(result, user);
                    } catch (RuntimeException exception) {
                        log.error("Purchase order {} was created, but its notification could not be sent",
                                result.getId(), exception);
                    }
                }
            });
        }
        return result;
    }

    private void notifyPurchaseOrderCreated(PurchaseOrderShowDTO result, User user) {
        double cost = result.getPartQuantities().stream()
                .mapToDouble(line -> line.getQuantity() * line.getPart().getCost()).sum();
        String title = messageSource.getMessage("new_po", null, Helper.getLocale(user));
        String message = messageSource.getMessage("notification_new_po_request", new Object[]{result.getName(),
                        cost, user.getCompany().getCompanySettings().getGeneralPreferences().getCurrency().getCode()},
                Helper.getLocale(user));
        Map<String, Object> mailVariables = new HashMap<>();
        mailVariables.put("purchaseOrderLink", frontendUrl + "/app/purchase-orders/" + result.getId());
        mailVariables.put("message", message);
        Collection<User> usersToNotify = userService.findByCompany(user.getCompany().getId()).stream()
                .filter(candidate -> candidate.isEnabled()
                        && (candidate.getRole().getViewPermissions().contains(PermissionEntity.SETTINGS)
                        || candidate.getRole().getCode().equals(RoleCode.LIMITED_ADMIN)))
                .collect(Collectors.toList());
        notificationService.createMultiple(usersToNotify.stream()
                .map(candidate -> new Notification(message, candidate, NotificationType.PURCHASE_ORDER, result.getId()))
                .collect(Collectors.toList()), true, title);
        Collection<User> usersToMail = usersToNotify.stream()
                .filter(candidate -> candidate.getUserSettings().shouldEmailUpdatesForPurchaseOrders())
                .collect(Collectors.toList());
        mailServiceFactory.getMailService().sendMessageUsingThymeleafTemplate(
                usersToMail.stream().map(User::getEmail).toArray(String[]::new), title, mailVariables,
                "new-purchase-order.html", Helper.getLocale(user), null);
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
            if (!savedPurchaseOrder.canBeEditedBy(user)) {
                throw new CustomException("Forbidden", HttpStatus.FORBIDDEN);
            }
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
        if (!saved.canBeEditedBy(user)) throw new CustomException("Forbidden", HttpStatus.FORBIDDEN);
        purchaseOrderPolicyService.requireModuleEnabled(user);
        if (saved.getStatus() == ApprovalStatus.APPROVED) {
            throw new CustomException("Approved purchase orders cannot be changed", HttpStatus.CONFLICT);
        }
        ensureNoRequisitionSourcedLines(saved);

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
            requestedParts.put(partId, part);
        }

        PurchaseOrderPatchDTO purchaseOrderPatch = request.getPurchaseOrder();
        purchaseOrderPatch.setVendor(resolveVendor(purchaseOrderPatch.getVendor(), user));
        purchaseOrderPatch.setCategory(resolveCategory(purchaseOrderPatch.getCategory(), user));
        PurchaseOrder updated = purchaseOrderService.update(id, user.getCompany().getId(), purchaseOrderPatch);
        replacePurchaseOrderLines(updated, requestedLines, requestedParts);

        runPurchaseOrderWorkflows(WFMainCondition.PURCHASE_ORDER_UPDATED, updated, user.getCompany().getId());
        return setPartQuantities(purchaseOrderMapper.toShowDto(updated));
    }

    private void replacePurchaseOrderLines(PurchaseOrder purchaseOrder,
                                           List<PartQuantityCompletePatchDTO> requestedLines,
                                           Map<Long, Part> requestedParts) {
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
                partQuantityService.save(existing);
            } else {
                partQuantityService.create(new PartQuantity(requestedParts.get(partId), null, purchaseOrder,
                        requested.getQuantity()));
            }
        }
        existingByPartId.forEach((partId, existing) -> {
            if (!requestedPartIds.contains(partId)) partQuantityService.delete(existing);
        });
    }

    private void runPurchaseOrderWorkflows(WFMainCondition condition, PurchaseOrder purchaseOrder, Long companyId) {
        boolean requisitionSourced = hasRequisitionSourcedLines(purchaseOrder);
        workflowService.findByMainConditionAndCompany(condition, companyId).stream()
                .filter(Workflow::isEnabled)
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

    @PatchMapping("/{id}/respond")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public PurchaseOrderShowDTO respond(@Parameter(description = "Whether the purchase order is approved") @RequestParam("approved") boolean approved, @PathVariable("id") Long id,
                                        HttpServletRequest req) {
        User user = userService.whoami(req);
        if (!user.getRole().getEditOtherPermissions().contains(PermissionEntity.PURCHASE_ORDERS)) {
            throw new CustomException("Forbidden", HttpStatus.FORBIDDEN);
        }
        purchaseOrderPolicyService.requireModuleEnabled(user);
        PurchaseOrder respondedPurchaseOrder = purchaseOrderApprovalService.respond(
                id, user.getCompany().getId(), approved);
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
            if (savedPurchaseOrder.canBeDeletedBy(user)) {
                purchaseOrderPolicyService.requireModuleEnabled(user);
                if (savedPurchaseOrder.getStatus() == ApprovalStatus.APPROVED) {
                    throw new CustomException("An approved purchase order cannot be deleted; " +
                            "use the cancellation workflow to preserve its stock and commitment history.",
                            HttpStatus.CONFLICT);
                }
                ensureNoRequisitionSourcedLines(savedPurchaseOrder);
                if (purchaseOrderReceiptService.hasReceipts(id)) {
                    throw new CustomException("A purchase order with receipt history cannot be deleted; " +
                            "use a cancellation workflow to preserve the stock audit.", HttpStatus.CONFLICT);
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

    private void ensureNoRequisitionSourcedLines(PurchaseOrder purchaseOrder) {
        if (partQuantityService.findByPurchaseOrder(purchaseOrder.getId()).stream()
                .anyMatch(line -> line.getRequisitionLine() != null)) {
            throw new CustomException("A purchase order sourced from a requisition cannot be edited or deleted. Reject it while pending to release reserved quantities; approved orders require a cancellation workflow.",
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


