package com.grash.controller;

import com.grash.dto.PartQuantityCompletePatchDTO;
import com.grash.dto.PartQuantityPatchDTO;
import com.grash.dto.PartQuantityShowDTO;
import com.grash.dto.SuccessResponse;
import com.grash.exception.CustomException;
import com.grash.mapper.PartQuantityMapper;
import com.grash.model.*;
import com.grash.model.enums.ApprovalStatus;
import com.grash.model.enums.PermissionEntity;
import com.grash.service.*;
import com.grash.utils.Helper;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import java.util.Collection;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/part-quantities")
@Tag(name = "Part Quantities", description = "Operations on part quantities")
@RequiredArgsConstructor
public class PartQuantityController {

    private final PartQuantityService partQuantityService;
    private final PartQuantityMapper partQuantityMapper;
    private final UserService userService;
    private final WorkOrderService workOrderService;
    private final PartService partService;
    private final PurchaseOrderService purchaseOrderService;
    private final PurchaseOrderPolicyService purchaseOrderPolicyService;

    @GetMapping("/work-order/{id}")
    @PreAuthorize("permitAll()")
    public Collection<PartQuantityShowDTO> getByWorkOrder(HttpServletRequest req,
                                                          @PathVariable("id") Long id) {
        User user = userService.whoami(req);
        Optional<WorkOrder> optionalWorkOrder = workOrderService.findByIdAndCompany(id, user.getCompany().getId());
        if (optionalWorkOrder.isPresent()) {
            if (!belongsToCompany(optionalWorkOrder.get(), user)
                    || !optionalWorkOrder.get().canBeViewedBy(user)
                    || !user.canAccessSite(optionalWorkOrder.get().getSite()))
                throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
            return partQuantityService.findByWorkOrder(id).stream().map(partQuantityMapper::toShowDto).collect(Collectors.toList());
        } else throw new CustomException("Not found", HttpStatus.NOT_FOUND);
    }

    @GetMapping("/purchase-order/{id}")
    @PreAuthorize("permitAll()")
    public Collection<PartQuantityShowDTO> getByPurchaseOrder(HttpServletRequest req, @PathVariable(
            "id") Long id) {
        User user = userService.whoami(req);
        if (!user.getRole().getViewPermissions().contains(PermissionEntity.PURCHASE_ORDERS)) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
        Optional<PurchaseOrder> optionalPurchaseOrder = purchaseOrderService.findByIdAndCompany_Id(
                id, user.getCompany().getId());
        if (optionalPurchaseOrder.isPresent()) {
            if (!optionalPurchaseOrder.get().canBeViewedBy(user))
                throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
            return partQuantityService.findByPurchaseOrder(id).stream().map(partQuantityMapper::toShowDto).collect(Collectors.toList());
        } else throw new CustomException("Not found", HttpStatus.NOT_FOUND);
    }

    @PatchMapping("/work-order/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public Collection<PartQuantityShowDTO> patchWorkOrder(@Parameter(description = "List of part IDs to associate " +
                                                                  "with work order") @Valid @RequestBody List<Long> parts,
                                                          @PathVariable("id") Long id,
                                                          HttpServletRequest req) {
        User user = userService.whoami(req);
        Optional<WorkOrder> optionalWorkOrder = workOrderService.findByIdAndCompany(id, user.getCompany().getId());

        if (optionalWorkOrder.isPresent()) {
            WorkOrder savedWorkOrder = optionalWorkOrder.get();
            if (!savedWorkOrder.canBeEditedBy(user) || !user.canAccessSite(savedWorkOrder.getSite())) {
                throw new CustomException("Forbidden", HttpStatus.FORBIDDEN);
            }
            if (savedWorkOrder.getFirstTimeToReact() == null) {
                savedWorkOrder.setFirstTimeToReact(new Date());
                workOrderService.save(savedWorkOrder);
            }
            if (parts.stream().distinct().count() != parts.size()) {
                throw new CustomException("A part can only be associated once", HttpStatus.BAD_REQUEST);
            }
            if (parts.stream().anyMatch(Objects::isNull)) {
                throw new CustomException("Part IDs are required", HttpStatus.BAD_REQUEST);
            }
            Collection<PartQuantity> partQuantities = partQuantityService.findByWorkOrder(id);
            Set<Long> requestedPartIds = new HashSet<>(parts);
            Set<Long> existingPartIds = partQuantities.stream()
                    .map(partQuantity -> partQuantity.getPart().getId())
                    .collect(Collectors.toSet());
            TreeSet<Long> changedPartIds = new TreeSet<>(requestedPartIds);
            changedPartIds.addAll(existingPartIds);
            changedPartIds.forEach(partId -> {
                if (requestedPartIds.contains(partId) && !existingPartIds.contains(partId)) {
                    Part part = partService.findByIdAndCompany(partId, user.getCompany().getId())
                            .orElseThrow(() -> new CustomException("Part not found", HttpStatus.NOT_FOUND));
                    partService.consumePart(part.getId(), 1, savedWorkOrder,
                            Helper.getLocale(user), false);
                    PartQuantity partQuantity = new PartQuantity(part, savedWorkOrder, null, 1);
                    partQuantityService.create(partQuantity);
                } else if (!requestedPartIds.contains(partId) && existingPartIds.contains(partId)) {
                    PartQuantity removedQuantity = partQuantities.stream().filter(partQuantity ->
                            partQuantity.getPart().getId().equals(partId)).findFirst()
                            .orElseThrow(() -> new CustomException("Part quantity not found", HttpStatus.NOT_FOUND));
                    partService.consumePart(partId, -removedQuantity.getQuantity(), savedWorkOrder,
                            Helper.getLocale(user), true);
                    partQuantityService.delete(removedQuantity);
                }
            });
            return partQuantityService.findByWorkOrder(id).stream().map(partQuantityMapper::toShowDto).collect(Collectors.toList());
        } else throw new CustomException("WorkOrder not found", HttpStatus.NOT_FOUND);
    }

    @PatchMapping("/purchase-order/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public Collection<PartQuantityShowDTO> patchPurchaseOrder(@Parameter(description = "List of part quantities to " +
                                                                      "update for purchase order") @Valid @RequestBody List<PartQuantityCompletePatchDTO> partQuantitiesReq, @PathVariable("id") Long id,
                                                              HttpServletRequest req) {
        User user = userService.whoami(req);
        Optional<PurchaseOrder> optionalPurchaseOrder = purchaseOrderService.findByIdForUpdateAndCompany(
                id, user.getCompany().getId());

        if (optionalPurchaseOrder.isPresent()) {
            PurchaseOrder savedPurchaseOrder = optionalPurchaseOrder.get();
            if (!savedPurchaseOrder.canBeEditedBy(user)) {
                throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
            }
            purchaseOrderPolicyService.requireModuleEnabled(user);
            ensurePurchaseOrderCanChangeLines(savedPurchaseOrder);
            Collection<PartQuantity> savedPartQuantities = partQuantityService.findByPurchaseOrder(id);

            if (partQuantitiesReq.stream().anyMatch(patch -> patch.getPart() == null || patch.getPart().getId() == null)) {
                throw new CustomException("Part IDs are required", HttpStatus.BAD_REQUEST);
            }
            if (partQuantitiesReq.stream().map(patch -> patch.getPart().getId()).distinct().count()
                    != partQuantitiesReq.size()) {
                throw new CustomException("A part can only be associated once", HttpStatus.BAD_REQUEST);
            }
            partQuantitiesReq.forEach(this::requirePositivePurchaseQuantity);
            List<Part> requestedParts = partQuantitiesReq.stream()
                    .map(partQuantity -> partService.findByIdAndCompany(partQuantity.getPart().getId(),
                                    user.getCompany().getId())
                            .orElseThrow(() -> new CustomException("Part not found", HttpStatus.NOT_FOUND)))
                    .toList();
            partQuantitiesReq.forEach(requestedLine -> {
                Part requestedPart = requestedParts.stream()
                        .filter(part -> part.getId().equals(requestedLine.getPart().getId()))
                        .findFirst().orElseThrow(() -> new CustomException("Part not found", HttpStatus.NOT_FOUND));
                requireWholeQuantityWhenUnitIsMissing(requestedPart, requestedLine.getQuantity());
            });

            Collection<Long> savedPartQuantitiesMappedPartIds = savedPartQuantities.stream().map
                    (partQuantity -> partQuantity.getPart().getId()).collect(Collectors.toList());

            Collection<Long> partQuantitiesReqMappedPartIds = partQuantitiesReq.stream().map
                    (partQuantity -> partQuantity.getPart().getId()).collect(Collectors.toList());
            partQuantitiesReq.forEach(partQuantityReq -> {
                if (savedPartQuantitiesMappedPartIds.contains(partQuantityReq.getPart().getId())) {
                    //existing parts
                    PartQuantity savedPartQuantity =
                            savedPartQuantities.stream().filter(partQuantity -> partQuantity.getPart().getId().equals(partQuantityReq.getPart().getId())).findFirst().get();
                    savedPartQuantity.setQuantity(partQuantityReq.getQuantity());
                    partQuantityService.save(savedPartQuantity);
                } else {
                    //new Parts
                    Part requestedPart = requestedParts.stream().filter(part -> part.getId().equals(partQuantityReq.getPart().getId()))
                            .findFirst().orElseThrow(() -> new CustomException("Part not found", HttpStatus.NOT_FOUND));
                    if (requestedPart != null) {
                        PartQuantity partQuantity = new PartQuantity(requestedPart, null, savedPurchaseOrder,
                                partQuantityReq.getQuantity());
                        partQuantityService.create(partQuantity);
                    }
                }
            });
            // removed Parts
            savedPartQuantitiesMappedPartIds.forEach(partId -> {
                if (!partQuantitiesReqMappedPartIds.contains(partId)) {
                    partQuantityService.delete(savedPartQuantities.stream().filter(partQuantity ->
                            partQuantity.getPart().getId().equals(partId)).findFirst().get());
                }
            });
            return partQuantityService.findByPurchaseOrder(id).stream().map(partQuantityMapper::toShowDto).collect(Collectors.toList());
        } else throw new CustomException("WorkOrder not found", HttpStatus.NOT_FOUND);
    }

    @GetMapping("/{id}")
    @PreAuthorize("permitAll()")
    public PartQuantityShowDTO getById(@PathVariable("id") Long id, HttpServletRequest req) {
        User user = userService.whoami(req);
        Optional<PartQuantity> optionalPartQuantity = partQuantityService.findById(id);
        if (optionalPartQuantity.isPresent()) {
            PartQuantity savedPartQuantity = optionalPartQuantity.get();
            if (savedPartQuantity.getPurchaseOrder() != null &&
                    (!belongsToCompany(savedPartQuantity.getPurchaseOrder(), user)
                            || !savedPartQuantity.getPurchaseOrder().canBeViewedBy(user))) {
                throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
            }
            if (savedPartQuantity.getWorkOrder() != null && (!belongsToCompany(savedPartQuantity.getWorkOrder(), user)
                    || !savedPartQuantity.getWorkOrder().canBeViewedBy(user)
                    || !user.canAccessSite(savedPartQuantity.getWorkOrder().getSite()))) {
                throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
            }
            if (savedPartQuantity.getPurchaseOrder() == null && savedPartQuantity.getWorkOrder() == null) {
                throw new CustomException("Part quantity has no parent document", HttpStatus.FORBIDDEN);
            }
            if (savedPartQuantity.getPurchaseOrder() != null && savedPartQuantity.getWorkOrder() != null) {
                throw new CustomException("Part quantity has multiple parent documents", HttpStatus.FORBIDDEN);
            }
            return partQuantityMapper.toShowDto(savedPartQuantity);
        } else throw new CustomException("Not found", HttpStatus.NOT_FOUND);
    }

    @PostMapping("")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    PartQuantityShowDTO create(@Parameter(description = "Part quantity to create") @Valid @RequestBody PartQuantity partQuantityReq,
                               HttpServletRequest req) {
        User user = userService.whoami(req);
        if (partQuantityReq.getRequisitionLine() != null) {
            throw new CustomException("Purchase requisition source links are managed by the conversion service",
                    HttpStatus.BAD_REQUEST);
        }
        if ((partQuantityReq.getPurchaseOrder() == null) == (partQuantityReq.getWorkOrder() == null)) {
            throw new CustomException("A part quantity must belong to exactly one purchase order or work order",
                    HttpStatus.BAD_REQUEST);
        }
        Part part = partService.findByIdAndCompany(partQuantityReq.getPart() == null ? null : partQuantityReq.getPart().getId(),
                        user.getCompany().getId())
                .orElseThrow(() -> new CustomException("Part not found", HttpStatus.NOT_FOUND));
        partQuantityReq.setPart(part);
        if (partQuantityReq.getPurchaseOrder() != null) {
            if (partQuantityReq.getPurchaseOrder().getId() == null) {
                throw new CustomException("Purchase order ID is required", HttpStatus.BAD_REQUEST);
            }
            PurchaseOrder purchaseOrder = purchaseOrderService.findByIdForUpdateAndCompany(
                            partQuantityReq.getPurchaseOrder().getId(), user.getCompany().getId())
                    .orElseThrow(() -> new CustomException("Purchase order not found", HttpStatus.NOT_FOUND));
            if (!purchaseOrder.canBeEditedBy(user)) throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
            purchaseOrderPolicyService.requireModuleEnabled(user);
            ensurePurchaseOrderCanChangeLines(purchaseOrder);
            requirePositivePurchaseQuantity(partQuantityReq.getQuantity());
            requireWholeQuantityWhenUnitIsMissing(part, partQuantityReq.getQuantity());
            partQuantityReq.setPurchaseOrder(purchaseOrder);
        } else {
            if (partQuantityReq.getWorkOrder().getId() == null) {
                throw new CustomException("Work order ID is required", HttpStatus.BAD_REQUEST);
            }
            WorkOrder workOrder = workOrderService.findByIdAndCompany(partQuantityReq.getWorkOrder().getId(),
                            user.getCompany().getId())
                    .orElseThrow(() -> new CustomException("Work order not found", HttpStatus.NOT_FOUND));
            if (!belongsToCompany(workOrder, user) || !workOrder.canBeEditedBy(user)
                    || !user.canAccessSite(workOrder.getSite())) {
                throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
            }
            partQuantityReq.setWorkOrder(workOrder);
        }
        PartQuantity savedPartQuantity = partQuantityService.create(partQuantityReq);
        return partQuantityMapper.toShowDto(savedPartQuantity);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public PartQuantityShowDTO patch(@Parameter(description = "Part quantity fields to update") @Valid @RequestBody PartQuantityPatchDTO partQuantity,
                                     @PathVariable("id") Long id,
                                     HttpServletRequest req) {
        User user = userService.whoami(req);
        Optional<PartQuantity> optionalPartQuantity = partQuantityService.findById(id);
        if (optionalPartQuantity.isPresent()) {
            PartQuantity savedPartQuantity = optionalPartQuantity.get();
            boolean isWorkOrderPartQuantity = savedPartQuantity.getWorkOrder() != null;
            if (isWorkOrderPartQuantity == (savedPartQuantity.getPurchaseOrder() != null)) {
                throw new CustomException("Part quantity must belong to exactly one parent document", HttpStatus.CONFLICT);
            }
            if (isWorkOrderPartQuantity) {
                if (!belongsToCompany(savedPartQuantity.getWorkOrder(), user)
                        || !savedPartQuantity.getWorkOrder().canBeEditedBy(user)
                        || !user.canAccessSite(savedPartQuantity.getWorkOrder().getSite())) {
                    throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
                }
            } else {
                PurchaseOrder purchaseOrder = purchaseOrderService.findByIdForUpdateAndCompany(
                                savedPartQuantity.getPurchaseOrder().getId(), user.getCompany().getId())
                        .orElseThrow(() -> new CustomException("Purchase order not found", HttpStatus.NOT_FOUND));
                if (!purchaseOrder.canBeEditedBy(user)) {
                    throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
                }
                purchaseOrderPolicyService.requireModuleEnabled(user);
                ensurePurchaseOrderCanChangeLines(purchaseOrder);
                requirePositivePurchaseQuantity(partQuantity.getQuantity());
                requireWholeQuantityWhenUnitIsMissing(savedPartQuantity.getPart(), partQuantity.getQuantity());
            }
            if (savedPartQuantity.getWorkOrder() != null) {
                partService.consumePart(savedPartQuantity.getPart().getId(),
                        partQuantity.getQuantity() - savedPartQuantity.getQuantity(),
                        savedPartQuantity.getWorkOrder(), Helper.getLocale(user), false);
            }
            PartQuantity patchedPartQuantity = partQuantityService.update(savedPartQuantity, partQuantity);
            return partQuantityMapper.toShowDto(patchedPartQuantity);
        } else throw new CustomException("PartQuantity not found", HttpStatus.NOT_FOUND);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public ResponseEntity<SuccessResponse> delete(@PathVariable("id") Long id, HttpServletRequest req) {
        User user = userService.whoami(req);

        Optional<PartQuantity> optionalPartQuantity = partQuantityService.findById(id);
        if (optionalPartQuantity.isPresent()) {
            PartQuantity savedPartQuantity = optionalPartQuantity.get();
            boolean isWorkOrderPartQuantity = savedPartQuantity.getWorkOrder() != null;
            if (isWorkOrderPartQuantity == (savedPartQuantity.getPurchaseOrder() != null)) {
                throw new CustomException("Part quantity must belong to exactly one parent document", HttpStatus.CONFLICT);
            }
            if (isWorkOrderPartQuantity ? belongsToCompany(savedPartQuantity.getWorkOrder(), user)
                    && savedPartQuantity.getWorkOrder().canBeEditedBy(user)
                    && user.canAccessSite(savedPartQuantity.getWorkOrder().getSite()) :
                    canDeletePurchaseOrderLine(savedPartQuantity, user)) {
                if (isWorkOrderPartQuantity) {
                    partService.consumePart(savedPartQuantity.getPart().getId(),
                            -savedPartQuantity.getQuantity(),
                            savedPartQuantity.getWorkOrder(), Helper.getLocale(user), true);
                }
                partQuantityService.delete(savedPartQuantity);
                return new ResponseEntity<>(new SuccessResponse(true, "Deleted successfully"),
                        HttpStatus.OK);
            } else throw new CustomException("Forbidden", HttpStatus.FORBIDDEN);
        } else throw new CustomException("PartQuantity not found", HttpStatus.NOT_FOUND);
    }

    private boolean belongsToCompany(PurchaseOrder purchaseOrder, User user) {
        return purchaseOrder.getCompany() != null
                && purchaseOrder.getCompany().getId().equals(user.getCompany().getId());
    }

    private boolean canDeletePurchaseOrderLine(PartQuantity partQuantity, User user) {
        PurchaseOrder purchaseOrder = purchaseOrderService.findByIdForUpdateAndCompany(
                        partQuantity.getPurchaseOrder().getId(), user.getCompany().getId())
                .orElseThrow(() -> new CustomException("Purchase order not found", HttpStatus.NOT_FOUND));
        if (!purchaseOrder.canBeEditedBy(user)) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
        purchaseOrderPolicyService.requireModuleEnabled(user);
        ensurePurchaseOrderCanChangeLines(purchaseOrder);
        return true;
    }

    private void ensurePurchaseOrderCanChangeLines(PurchaseOrder purchaseOrder) {
        if (purchaseOrder.getStatus() == ApprovalStatus.APPROVED) {
            throw new CustomException("Approved purchase order lines cannot be changed", HttpStatus.CONFLICT);
        }
        if (partQuantityService.findByPurchaseOrder(purchaseOrder.getId()).stream()
                .anyMatch(line -> line.getRequisitionLine() != null)) {
            throw new CustomException("Purchase order lines linked to an approved requisition cannot be changed",
                    HttpStatus.CONFLICT);
        }
    }

    private void requirePositivePurchaseQuantity(PartQuantityCompletePatchDTO partQuantity) {
        requirePositivePurchaseQuantity(partQuantity.getQuantity());
    }

    private void requirePositivePurchaseQuantity(double quantity) {
        if (!Double.isFinite(quantity) || quantity <= 0) {
            throw new CustomException("Purchase order quantity must be greater than zero",
                    HttpStatus.BAD_REQUEST);
        }
    }

    private void requireWholeQuantityWhenUnitIsMissing(Part part, double quantity) {
        if (part.getUnit() == null && quantity != Math.rint(quantity)) {
            throw new CustomException("A whole quantity is required when the part has no unit",
                    HttpStatus.BAD_REQUEST);
        }
    }

    private boolean belongsToCompany(WorkOrder workOrder, User user) {
        return workOrder.getCompany() != null
                && workOrder.getCompany().getId().equals(user.getCompany().getId());
    }

}


