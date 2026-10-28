package com.grash.controller;

import com.grash.dto.PurchaseOrderShowDTO;
import com.grash.advancedsearch.SearchCriteria;
import com.grash.advancedsearch.SpecificationBuilder;
import com.grash.mapper.PartQuantityMapper;
import com.grash.mapper.PurchaseOrderMapper;
import com.grash.dto.PurchaseRequisitionConversionRequest;
import com.grash.dto.PurchaseRequisitionCreateRequest;
import com.grash.dto.PurchaseRequisitionDecisionRequest;
import com.grash.dto.PurchaseRequisitionShowDTO;
import com.grash.exception.CustomException;
import com.grash.model.*;
import com.grash.model.enums.PermissionEntity;
import com.grash.model.enums.PurchaseRequisitionStatus;
import com.grash.model.enums.RoleType;
import com.grash.model.enums.workflow.WFMainCondition;
import com.grash.model.enums.workflow.PurchaseOrderAction;
import com.grash.repository.PurchaseRequisitionRepository;
import com.grash.repository.VendorRepository;
import com.grash.service.PartService;
import com.grash.service.PartQuantityService;
import com.grash.service.PurchaseOrderPolicyService;
import com.grash.service.PurchaseOrderService;
import com.grash.service.UserService;
import com.grash.service.WorkflowService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.hibernate.Hibernate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/purchase-requisitions")
@RequiredArgsConstructor
public class PurchaseRequisitionController {
    private final PurchaseRequisitionRepository requisitionRepository;
    private final UserService userService;
    private final PartService partService;
    private final VendorRepository vendorRepository;
    private final PurchaseOrderService purchaseOrderService;
    private final PartQuantityService partQuantityService;
    private final PurchaseOrderPolicyService procurementPolicy;
    private final WorkflowService workflowService;
    private final PurchaseOrderMapper purchaseOrderMapper;
    private final PartQuantityMapper partQuantityMapper;

    @PostMapping
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public PurchaseRequisitionShowDTO create(@Valid @RequestBody PurchaseRequisitionCreateRequest request,
                                               HttpServletRequest httpRequest) {
        User user = userService.whoami(httpRequest);
        require(user, "create");
        procurementPolicy.requireModuleEnabled(user);
        PurchaseRequisition requisition = new PurchaseRequisition();
        requisition.setTitle(request.getTitle().trim());
        requisition.setJustification(request.getJustification());
        requisition.setRequiredDate(request.getRequiredDate());
        requisition.setRequester(user);
        applyLines(requisition, request.getLines(), user);
        return show(requisitionRepository.save(requisition));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public PurchaseRequisitionShowDTO update(@PathVariable Long id,
            @Valid @RequestBody PurchaseRequisitionCreateRequest request, HttpServletRequest httpRequest) {
        User user = userService.whoami(httpRequest);
        procurementPolicy.requireModuleEnabled(user);
        PurchaseRequisition requisition = locked(id, user);
        if (!requisition.canEdit(user) || requisition.getStatus() != PurchaseRequisitionStatus.DRAFT) {
            throw new CustomException("Only a draft requisition can be edited", HttpStatus.CONFLICT);
        }
        requisition.setTitle(request.getTitle().trim());
        requisition.setJustification(request.getJustification());
        requisition.setRequiredDate(request.getRequiredDate());
        requisition.getLines().clear();
        applyLines(requisition, request.getLines(), user);
        return show(requisitionRepository.save(requisition));
    }

    @GetMapping("/{id}")
    @PreAuthorize("permitAll()")
    @Transactional(readOnly = true)
    public PurchaseRequisitionShowDTO get(@PathVariable Long id, HttpServletRequest httpRequest) {
        User user = userService.whoami(httpRequest);
        PurchaseRequisition requisition = requisitionRepository.findWithLinesByIdAndCompany(id, user.getCompany().getId())
                .orElseThrow(() -> new CustomException("Purchase requisition not found", HttpStatus.NOT_FOUND));
        if (!requisition.canView(user)) throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        return show(requisition);
    }

    @PostMapping("/search")
    @PreAuthorize("permitAll()")
    @Transactional(readOnly = true)
    public Page<PurchaseRequisitionShowDTO> list(@RequestBody(required = false) SearchCriteria criteria,
                                                  HttpServletRequest httpRequest) {
        User user = userService.whoami(httpRequest);
        boolean canViewOwn = user.getRole().getCreatePermissions().contains(PermissionEntity.PURCHASE_REQUISITIONS)
                || user.getRole().getEditOtherPermissions().contains(PermissionEntity.PURCHASE_REQUISITIONS);
        boolean canViewAny = user.getRole().getViewPermissions().contains(PermissionEntity.PURCHASE_REQUISITIONS)
                && user.getRole().getViewOtherPermissions().contains(PermissionEntity.PURCHASE_REQUISITIONS);
        if (user.getRole().getRoleType() == RoleType.ROLE_CLIENT && !canViewOwn && !canViewAny) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
        SearchCriteria search = criteria == null ? new SearchCriteria() : criteria;
        search.filterCompany(user);
        if (!canViewAny) {
            search.filterCreatedBy(user);
        }
        SpecificationBuilder<PurchaseRequisition> builder = new SpecificationBuilder<>();
        search.getFilterFields().forEach(builder::with);
        PageRequest page = PageRequest.of(Math.max(0, search.getPageNum()),
                Math.max(1, Math.min(100, search.getPageSize())), Sort.Direction.DESC, "createdAt");
        return requisitionRepository.findAll(builder.build(), page).map(this::show);
    }

    @PostMapping("/{id}/submit")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public PurchaseRequisitionShowDTO submit(@PathVariable Long id, HttpServletRequest httpRequest) {
        User user = userService.whoami(httpRequest);
        procurementPolicy.requireModuleEnabled(user);
        PurchaseRequisition requisition = locked(id, user);
        if (!requisition.canEdit(user) || requisition.getStatus() != PurchaseRequisitionStatus.DRAFT
                || requisition.getLines().isEmpty()) {
            throw new CustomException("A non-empty draft requisition is required", HttpStatus.CONFLICT);
        }
        requisition.setStatus(PurchaseRequisitionStatus.PENDING_APPROVAL);
        return show(requisitionRepository.save(requisition));
    }

    @PostMapping("/{id}/decision")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public PurchaseRequisitionShowDTO decide(@PathVariable Long id,
            @Valid @RequestBody PurchaseRequisitionDecisionRequest decision, HttpServletRequest httpRequest) {
        User user = userService.whoami(httpRequest);
        require(user, "edit");
        procurementPolicy.requireModuleEnabled(user);
        PurchaseRequisition requisition = locked(id, user);
        if (requisition.getStatus() != PurchaseRequisitionStatus.PENDING_APPROVAL) {
            throw new CustomException("Only pending requisitions can be decided", HttpStatus.CONFLICT);
        }
        if (!requisition.canView(user)) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
        if (requisition.getRequester() != null && requisition.getRequester().getId().equals(user.getId())) {
            throw new CustomException("A requester cannot approve or reject their own requisition", HttpStatus.FORBIDDEN);
        }
        if (!decision.getApproved() && (decision.getNote() == null || decision.getNote().isBlank())) {
            throw new CustomException("A rejection note is required", HttpStatus.BAD_REQUEST);
        }
        requisition.setStatus(decision.getApproved() ? PurchaseRequisitionStatus.APPROVED : PurchaseRequisitionStatus.REJECTED);
        requisition.setDecisionBy(user);
        requisition.setDecisionAt(new Date());
        requisition.setDecisionNote(decision.getNote() == null ? null : decision.getNote().trim());
        return show(requisitionRepository.save(requisition));
    }

    /** Convert selected approved quantities to a supplier PO. Direct PO creation remains available. */
    @PostMapping("/{id}/convert-to-order")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public PurchaseOrderShowDTO convert(@PathVariable Long id,
            @Valid @RequestBody PurchaseRequisitionConversionRequest request, HttpServletRequest httpRequest) {
        User user = userService.whoami(httpRequest);
        if (!user.getRole().getCreatePermissions().contains(PermissionEntity.PURCHASE_ORDERS)) {
            throw new CustomException("Purchase order creation is not allowed", HttpStatus.FORBIDDEN);
        }
        procurementPolicy.requireModuleEnabled(user);
        PurchaseRequisition requisition = locked(id, user);
        if (!requisition.canView(user) || !EnumSet.of(PurchaseRequisitionStatus.APPROVED,
                PurchaseRequisitionStatus.PARTIALLY_ORDERED).contains(requisition.getStatus())) {
            throw new CustomException("Only approved requisitions can be converted", HttpStatus.CONFLICT);
        }
        Vendor vendor = vendorRepository.findByIdAndCompany_Id(request.getVendorId(), user.getCompany().getId())
                .orElseThrow(() -> new CustomException("Vendor not found", HttpStatus.NOT_FOUND));
        if (request.getLines().stream().map(PurchaseRequisitionConversionRequest.Line::getRequisitionLineId)
                .distinct().count() != request.getLines().size()) {
            throw new CustomException("A requisition line can only be selected once", HttpStatus.BAD_REQUEST);
        }
        PurchaseOrder order = new PurchaseOrder();
        order.setName(request.getPurchaseOrderName() == null || request.getPurchaseOrderName().isBlank()
                ? "PR-" + requisition.getId() + " — " + requisition.getTitle() : request.getPurchaseOrderName().trim());
        order.setVendor(vendor);
        order.setReceivingWorkflowEnabled(true);
        order.setAdditionalInfoRequisitionedName(requisition.getRequester() == null ? null
                : requisition.getRequester().getFirstName() + " " + requisition.getRequester().getLastName());
        order = purchaseOrderService.create(order);
        PurchaseOrder createdOrder = order;
        for (PurchaseRequisitionConversionRequest.Line selected : request.getLines()) {
            PurchaseRequisitionLine line = requisition.getLines().stream()
                    .filter(candidate -> candidate.getId().equals(selected.getRequisitionLineId())).findFirst()
                    .orElseThrow(() -> new CustomException("Requisition line not found", HttpStatus.NOT_FOUND));
            double quantity = selected.getQuantity();
            double remainingQuantity = line.getQuantity() - line.getOrderedQuantity();
            if (!Double.isFinite(quantity) || quantity <= 0 || quantity > remainingQuantity + 1e-9) {
                throw new CustomException("Ordered quantity exceeds the remaining requested quantity", HttpStatus.CONFLICT);
            }
            if (line.getPart().getUnit() == null && quantity != Math.rint(quantity)) {
                throw new CustomException("A whole quantity is required when the part has no unit", HttpStatus.BAD_REQUEST);
            }
            line.setOrderedQuantity(line.getOrderedQuantity() + quantity);
            PartQuantity orderLine = new PartQuantity(line.getPart(), null, order, quantity);
            orderLine.setRequisitionLine(line);
            partQuantityService.create(orderLine);
        }
        boolean remaining = requisition.getLines().stream()
                .anyMatch(line -> line.getOrderedQuantity() + 1e-9 < line.getQuantity());
        requisition.setStatus(remaining ? PurchaseRequisitionStatus.PARTIALLY_ORDERED : PurchaseRequisitionStatus.ORDERED);
        requisitionRepository.save(requisition);
        workflowService.findByCompany(user.getCompany().getId()).stream()
                .filter(workflow -> workflow.isEnabled()
                        && workflow.getMainCondition() == WFMainCondition.PURCHASE_ORDER_CREATED
                        // A requisition-to-order conversion must not treat PO approval as physical receipt.
                        && workflow.getAction() != null
                        && workflow.getAction().getPurchaseOrderAction() != null
                        && workflow.getAction().getPurchaseOrderAction() != PurchaseOrderAction.APPROVE
                        && workflow.getAction().getPurchaseOrderAction() != PurchaseOrderAction.REJECT)
                .forEach(workflow -> workflowService.runPurchaseOrder(workflow, createdOrder));
        return purchaseOrderService.findByIdAndCompany_Id(order.getId(), user.getCompany().getId())
                .map(saved -> {
                    PurchaseOrderShowDTO result = purchaseOrderMapper.toShowDto(saved);
                    result.setPartQuantities(partQuantityService.findByPurchaseOrder(saved.getId()).stream()
                            .map(line -> {
                                var dto = partQuantityMapper.toShowDto(line);
                                dto.setRemainingToReceive(line.getQuantity());
                                return dto;
                            }).collect(Collectors.toList()));
                    return result;
                }).orElseThrow(() -> new CustomException("Created purchase order not found", HttpStatus.INTERNAL_SERVER_ERROR));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public void delete(@PathVariable Long id, HttpServletRequest httpRequest) {
        User user = userService.whoami(httpRequest);
        procurementPolicy.requireModuleEnabled(user);
        PurchaseRequisition requisition = locked(id, user);
        boolean canDelete = requisition.getRequester() != null
                && requisition.getRequester().getId().equals(user.getId())
                || user.getRole().getRoleType() != RoleType.ROLE_CLIENT
                || user.getRole().getDeleteOtherPermissions().contains(PermissionEntity.PURCHASE_REQUISITIONS);
        if (!canDelete || requisition.getStatus() != PurchaseRequisitionStatus.DRAFT) {
            throw new CustomException("Only draft requisitions can be deleted", HttpStatus.CONFLICT);
        }
        requisitionRepository.delete(requisition);
    }

    private PurchaseRequisition locked(Long id, User user) {
        PurchaseRequisition requisition = requisitionRepository.findByIdForUpdateAndCompany(id, user.getCompany().getId())
                .orElseThrow(() -> new CustomException("Purchase requisition not found", HttpStatus.NOT_FOUND));
        Hibernate.initialize(requisition.getLines());
        return requisition;
    }

    private void applyLines(PurchaseRequisition requisition, List<PurchaseRequisitionCreateRequest.Line> lines, User user) {
        Set<Long> partIds = new HashSet<>();
        for (PurchaseRequisitionCreateRequest.Line input : lines) {
            if (!Double.isFinite(input.getQuantity()) || input.getQuantity() <= 0) {
                throw new CustomException("Requested quantity must be greater than zero", HttpStatus.BAD_REQUEST);
            }
            if (!partIds.add(input.getPartId())) {
                throw new CustomException("A part can only appear once in a requisition", HttpStatus.BAD_REQUEST);
            }
            Part part = partService.findByIdAndCompany(input.getPartId(), user.getCompany().getId())
                    .orElseThrow(() -> new CustomException("Part not found", HttpStatus.NOT_FOUND));
            if (part.getUnit() == null && input.getQuantity() != Math.rint(input.getQuantity())) {
                throw new CustomException("A whole quantity is required when the part has no unit", HttpStatus.BAD_REQUEST);
            }
            PurchaseRequisitionLine line = new PurchaseRequisitionLine();
            line.setRequisition(requisition);
            line.setPart(part);
            line.setQuantity(input.getQuantity());
            line.setNotes(input.getNotes());
            requisition.getLines().add(line);
        }
    }

    private PurchaseRequisitionShowDTO show(PurchaseRequisition requisition) {
        return PurchaseRequisitionShowDTO.builder().id(requisition.getId()).title(requisition.getTitle())
                .justification(requisition.getJustification()).requiredDate(requisition.getRequiredDate())
                .status(requisition.getStatus()).requesterId(requisition.getRequester() == null ? null : requisition.getRequester().getId())
                .requesterName(requisition.getRequester() == null ? null : requisition.getRequester().getFirstName() + " " + requisition.getRequester().getLastName())
                .decisionById(requisition.getDecisionBy() == null ? null : requisition.getDecisionBy().getId())
                .decisionAt(requisition.getDecisionAt()).decisionNote(requisition.getDecisionNote())
                .lines(requisition.getLines().stream().map(line -> PurchaseRequisitionShowDTO.Line.builder()
                        .id(line.getId()).partId(line.getPart().getId()).partName(line.getPart().getName())
                        .unit(line.getPart().getUnit()).quantity(line.getQuantity()).orderedQuantity(line.getOrderedQuantity())
                        .notes(line.getNotes()).build()).collect(Collectors.toList())).build();
    }

    private void require(User user, String operation) {
        PermissionEntity permission = PermissionEntity.PURCHASE_REQUISITIONS;
        boolean allowed = switch (operation) {
            case "create" -> user.getRole().getCreatePermissions().contains(permission);
            case "view" -> user.getRole().getViewPermissions().contains(permission);
            case "edit" -> user.getRole().getEditOtherPermissions().contains(permission);
            case "delete" -> user.getRole().getDeleteOtherPermissions().contains(permission);
            default -> false;
        };
        if (user.getRole().getRoleType() == RoleType.ROLE_CLIENT && !allowed) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
    }
}
