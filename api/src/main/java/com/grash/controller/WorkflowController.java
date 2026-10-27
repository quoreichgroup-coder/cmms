package com.grash.controller;

import com.grash.dto.SuccessResponse;
import com.grash.dto.WorkflowPostDTO;
import com.grash.dto.WorkflowActionPostDTO;
import com.grash.dto.WorkflowShowDTO;
import com.grash.dto.license.LicenseEntitlement;
import com.grash.exception.CustomException;
import com.grash.mapper.WorkflowActionMapper;
import com.grash.mapper.WorkflowConditionMapper;
import com.grash.mapper.WorkflowMapper;
import com.grash.model.*;
import com.grash.model.enums.PermissionEntity;
import com.grash.model.enums.PlanFeatures;
import com.grash.model.enums.RoleType;
import com.grash.model.enums.workflow.PartAction;
import com.grash.model.enums.workflow.WFMainCondition;
import com.grash.service.*;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/workflows")
@Tag(name = "Workflows", description = "Operations on workflows")
@RequiredArgsConstructor
public class WorkflowController {

    private final WorkflowService workflowService;
    private final UserService userService;
    private final WorkflowConditionMapper workflowConditionMapper;
    private final WorkflowConditionService workflowConditionService;
    private final WorkflowActionMapper workflowActionMapper;
    private final WorkflowActionService workflowActionService;
    private final LicenseService licenseService;
    private final WorkflowMapper workflowMapper;
    private final PurchaseOrderPolicyService purchaseOrderPolicyService;
    private final VendorService vendorService;
    private final PurchaseOrderCategoryService purchaseOrderCategoryService;

    @GetMapping("")
    @PreAuthorize("permitAll()")
    public Collection<WorkflowShowDTO> getAll(HttpServletRequest req) {
        User user = userService.whoami(req);
        if (user.getRole().getRoleType().equals(RoleType.ROLE_CLIENT)) {
            if (!user.getRole().getViewPermissions().contains(PermissionEntity.SETTINGS)) {
                throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
            }
            return workflowService.findByCompany(user.getCompany().getId()).stream().map(workflowMapper::toShowDto).collect(Collectors.toList());
        } else
            return workflowService.getAll().stream().map(workflowMapper::toShowDto).collect(Collectors.toList());
    }

    @PostMapping("")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public WorkflowShowDTO create(@Parameter(description = "Workflow data to create") @Valid @RequestBody WorkflowPostDTO workflowReq,
                                  HttpServletRequest req) {
        User user = userService.whoami(req);
        if (user.getRole().getViewPermissions().contains(PermissionEntity.SETTINGS)) {
            requireProcurementEnabledForWorkflow(workflowReq, user);
            validateProcurementReferences(workflowReq, user);
            requireSupportedWorkflowActions(workflowReq);
            int workflowsCount =
                    (int) workflowService.findByCompany(user.getCompany().getId()).stream().filter(Workflow::isEnabled).count();
            if ((user.getCompany().getSubscription().getSubscriptionPlan().getFeatures().contains(PlanFeatures.WORKFLOW) && licenseService.hasEntitlement(LicenseEntitlement.WORKFLOW)) || workflowsCount == 0) {
                return workflowMapper.toShowDto(createWorkflow(workflowReq, user.getCompany()));
            } else
                throw new CustomException("You can't create a new workflow. Please upgrade", HttpStatus.NOT_ACCEPTABLE);
        } else throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
    }

    @GetMapping("/{id}")
    @PreAuthorize("permitAll()")
    public WorkflowShowDTO getById(@PathVariable("id") Long id, HttpServletRequest req) {
        User user = userService.whoami(req);
        if (!user.getRole().getViewPermissions().contains(PermissionEntity.SETTINGS)) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
        Optional<Workflow> optionalWorkflow = user.getRole().getRoleType().equals(RoleType.ROLE_CLIENT)
                ? workflowService.findByIdAndCompany(id, user.getCompany().getId())
                : workflowService.findById(id);
        if (optionalWorkflow.isPresent()) {
            Workflow savedWorkflow = optionalWorkflow.get();
            return workflowMapper.toShowDto(savedWorkflow);
        } else throw new CustomException("Not found", HttpStatus.NOT_FOUND);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public WorkflowShowDTO patch(@Parameter(description = "Workflow fields to update") @Valid @RequestBody WorkflowPostDTO workflow,
                                 @PathVariable("id") Long id,
                                 HttpServletRequest req) {
        User user = userService.whoami(req);
        if (!user.getRole().getViewPermissions().contains(PermissionEntity.SETTINGS)) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
        Optional<Workflow> optionalWorkflow = workflowService.findByIdAndCompany(id, user.getCompany().getId());

        if (optionalWorkflow.isPresent()) {
            requireProcurementEnabledForWorkflow(workflow, user);
            validateProcurementReferences(workflow, user);
            requireSupportedWorkflowActions(workflow);
            Workflow savedWorkflow = optionalWorkflow.get();
            workflowService.delete(id);
            return workflowMapper.toShowDto(createWorkflow(workflow, user.getCompany()));
        } else throw new CustomException("Workflow not found", HttpStatus.NOT_FOUND);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public ResponseEntity<SuccessResponse> delete(@PathVariable("id") Long id, HttpServletRequest req) {
        User user = userService.whoami(req);
        if (!user.getRole().getViewPermissions().contains(PermissionEntity.SETTINGS)) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }

        Optional<Workflow> optionalWorkflow = workflowService.findByIdAndCompany(id, user.getCompany().getId());
        if (optionalWorkflow.isPresent()) {
            Workflow savedWorkflow = optionalWorkflow.get();
            workflowService.delete(id);
            return new ResponseEntity(new SuccessResponse(true, "Deleted successfully"),
                    HttpStatus.OK);
        } else throw new CustomException("Workflow not found", HttpStatus.NOT_FOUND);
    }

    private Workflow createWorkflow(WorkflowPostDTO workflowReq, Company company) {
        List<WorkflowCondition> workflowConditions =
                workflowReq.getSecondaryConditions().stream().map(workflowConditionMapper::toModel)
                        .collect(Collectors.toList());
        Collection<WorkflowCondition> savedWorkOrderConditions = workflowConditionService.saveAll(workflowConditions);
        WorkflowAction workflowAction = workflowActionMapper.toModel(workflowReq.getAction());
        WorkflowAction savedWorkflowAction = workflowActionService.create(workflowAction);
        Workflow workflow = Workflow.builder()
                .title(workflowReq.getTitle())
                .mainCondition(workflowReq.getMainCondition())
                .secondaryConditions(savedWorkOrderConditions)
                .action(savedWorkflowAction)
                .enabled(true)
                .build();
        return workflowService.create(workflow);
    }

    private void requireProcurementEnabledForWorkflow(WorkflowPostDTO workflow, User user) {
        boolean purchaseOrderTrigger = workflow.getMainCondition() == WFMainCondition.PURCHASE_ORDER_CREATED
                || workflow.getMainCondition() == WFMainCondition.PURCHASE_ORDER_UPDATED;
        boolean purchaseOrderAction = workflow.getAction() != null
                && (workflow.getAction().getPurchaseOrderAction() != null
                || workflow.getAction().getPurchaseOrderCategory() != null
                || workflow.getAction().getPartAction() == PartAction.CREATE_PURCHASE_ORDER);
        boolean purchaseOrderCondition = workflow.getSecondaryConditions() != null
                && workflow.getSecondaryConditions().stream().anyMatch(condition -> condition != null
                && (condition.getPurchaseOrderCondition() != null
                || condition.getPurchaseOrderCategory() != null
                || condition.getPurchaseOrderStatus() != null || condition.getVendor() != null));
        if (purchaseOrderTrigger || purchaseOrderAction || purchaseOrderCondition) {
            purchaseOrderPolicyService.requireModuleEnabled(user);
        }
    }

    private void requireSupportedWorkflowActions(WorkflowPostDTO workflow) {
        if (workflow.getAction() != null
                && (workflow.getAction().getPartAction() == PartAction.CREATE_PURCHASE_ORDER
                || workflow.getAction().getPurchaseOrderAction()
                == com.grash.model.enums.workflow.PurchaseOrderAction.SEND_REMINDER_EMAIL)) {
            throw new CustomException(
                    "This purchase order workflow action is not supported yet",
                    HttpStatus.NOT_IMPLEMENTED);
        }
    }

    private void validateProcurementReferences(WorkflowPostDTO workflow, User user) {
        WorkflowActionPostDTO action = workflow.getAction();
        if (action != null) {
            if (action.getPurchaseOrderAction() == com.grash.model.enums.workflow.PurchaseOrderAction.ASSIGN_VENDOR) {
                requireVendorInCompany(action.getVendor(), user);
            }
            if (action.getPurchaseOrderAction() == com.grash.model.enums.workflow.PurchaseOrderAction.ASSIGN_CATEGORY) {
                requireCategoryInCompany(action.getPurchaseOrderCategory(), user);
            }
        }
        if (workflow.getSecondaryConditions() == null) return;
        workflow.getSecondaryConditions().stream()
                .filter(condition -> condition != null && (condition.getPurchaseOrderCondition() != null
                        || condition.getPurchaseOrderCategory() != null || condition.getVendor() != null))
                .forEach(condition -> {
                    if (condition.getPurchaseOrderCategory() != null) {
                        requireCategoryInCompany(condition.getPurchaseOrderCategory(), user);
                    }
                    if (condition.getVendor() != null) requireVendorInCompany(condition.getVendor(), user);
                });
    }

    private void requireVendorInCompany(Vendor vendor, User user) {
        if (vendor == null || vendor.getId() == null
                || vendorService.findByIdAndCompany(vendor.getId(), user.getCompany().getId()).isEmpty()) {
            throw new CustomException("Vendor not found", HttpStatus.BAD_REQUEST);
        }
    }

    private void requireCategoryInCompany(PurchaseOrderCategory category, User user) {
        if (category == null || category.getId() == null
                || purchaseOrderCategoryService.findByIdAndCompanySettings(category.getId(),
                user.getCompany().getCompanySettings().getId()).isEmpty()) {
            throw new CustomException("Purchase order category not found", HttpStatus.BAD_REQUEST);
        }
    }
}


