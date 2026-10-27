package com.grash.service;

import com.grash.dto.WorkflowPatchDTO;
import com.grash.exception.CustomException;
import com.grash.mapper.WorkflowMapper;
import com.grash.model.*;
import com.grash.model.abstracts.CompanyAudit;
import com.grash.model.enums.TaskType;
import com.grash.model.enums.workflow.WFMainCondition;
import com.grash.repository.*;
import com.grash.utils.AuditComparator;
import com.grash.utils.Sanitizer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WorkflowService {
    private final WorkflowRepository workflowRepository;
    private final WorkflowMapper workflowMapper;
    private final WorkOrderRepository workOrderRepository;
    private final RequestRepository requestRepository;
    private final AssetRepository assetRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderApprovalService purchaseOrderApprovalService;
    private final TaskRepository taskRepository;

    public Workflow create(Workflow Workflow) {
        Sanitizer.sanitizeWorkflow(Workflow);
        return workflowRepository.save(Workflow);
    }

    public Workflow update(Long id, WorkflowPatchDTO workflowsPatchDTO) {
        if (workflowRepository.existsById(id)) {
            Workflow savedWorkflow = workflowRepository.findById(id).get();
            Workflow updatedWorkflow = workflowMapper.updateWorkflow(savedWorkflow, workflowsPatchDTO);
            Sanitizer.sanitizeWorkflow(updatedWorkflow);
            return workflowRepository.save(updatedWorkflow);
        } else throw new CustomException("Not found", HttpStatus.NOT_FOUND);
    }

    public Collection<Workflow> getAll() {
        return workflowRepository.findAll();
    }

    public void delete(Long id) {
        workflowRepository.deleteById(id);
    }

    public Optional<Workflow> findById(Long id) {
        return workflowRepository.findById(id);
    }

    public Optional<Workflow> findByIdAndCompany(Long id, Long companyId) {
        return workflowRepository.findByIdAndCompany_Id(id, companyId);
    }

    public Collection<Workflow> findByMainConditionAndCompany(WFMainCondition mainCondition, Long id) {
        return workflowRepository.findByMainConditionAndCompany_Id(mainCondition, id);
    }

    public Collection<Workflow> findByCompany(Long id) {
        return workflowRepository.findByCompany_Id(id);
    }

    public void runWorkOrder(Workflow workflow, WorkOrder workOrder) {
        if (!sameCompany(workflow, workOrder)) return;
        if (workflow.getSecondaryConditions().stream().allMatch(workflowCondition -> workflowCondition.isMetForWorkOrder(workOrder))) {
            WorkflowAction action = workflow.getAction();
            switch (action.getWorkOrderAction()) {
                case ADD_CHECKLIST:
                    addChecklistToWorkOrder(workflow, workOrder);
                    return;
                case SEND_REMINDER_EMAIL:
                    //TODO
                    return;
                case ASSIGN_TEAM:
                    if (isTeamCompatibleWithSite(action.getTeam(), workOrder.getCompany(), workOrder.getSite())) {
                        workOrder.setTeam(action.getTeam());
                    } else {
                        log.warn("Workflow {} skipped team assignment for work order {} because the team is outside its company or site scope",
                                workflow.getId(), workOrder.getId());
                    }
                    break;
                case ASSIGN_USER:
                    workOrder.setPrimaryUser(action.getUser());
                    break;
                case ASSIGN_ASSET:
                    workOrder.setAsset(action.getAsset());
                    break;
                case ASSIGN_CATEGORY:
                    workOrder.setCategory(action.getWorkOrderCategory());
                    break;
                case ASSIGN_LOCATION:
                    workOrder.setLocation(action.getLocation());
                    break;
                case ASSIGN_PRIORITY:
                    workOrder.setPriority(action.getPriority());
                    break;
                default:
                    break;
            }
            workOrderRepository.save(workOrder);
        }
    }

    /**
     * Copies checklist task templates to a work order once. Workflows can be
     * evaluated more than once for the same order, so existing task templates
     * are retained and never duplicated.
     */
    public void addChecklistToWorkOrder(Workflow workflow, WorkOrder workOrder) {
        WorkflowAction action = workflow.getAction();
        Checklist checklist = action == null ? null : action.getChecklist();
        if (checklist == null || checklist.getTaskBases() == null || workOrder == null
                || workflow.getCompany() == null || workOrder.getCompany() == null
                || checklist.getCompanySettings() == null
                || checklist.getCompanySettings().getCompany() == null
                || !workflow.getCompany().getId().equals(workOrder.getCompany().getId())
                || !checklist.getCompanySettings().getCompany().getId().equals(workOrder.getCompany().getId())) {
            return;
        }

        List<Task> existingTasks = taskRepository.findByWorkOrder_IdOrderByTaskOrderAscCreatedAtAscIdAsc(
                workOrder.getId());
        Set<Long> existingTaskBaseIds = existingTasks.stream()
                .map(Task::getTaskBase)
                .filter(java.util.Objects::nonNull)
                .map(TaskBase::getId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        int nextOrder = existingTasks.stream().mapToInt(Task::getTaskOrder).max().orElse(-1) + 1;
        AtomicInteger taskOrder = new AtomicInteger(nextOrder);
        List<Task> tasksToCreate = checklist.getTaskBases().stream()
                .filter(java.util.Objects::nonNull)
                .filter(taskBase -> taskBase.getId() != null && !existingTaskBaseIds.contains(taskBase.getId()))
                .filter(taskBase -> taskBase.getCompany() != null
                        && taskBase.getCompany().getId().equals(workOrder.getCompany().getId()))
                .map(taskBase -> {
                    String initialValue = "";
                    if (TaskType.SUBTASK.equals(taskBase.getTaskType())) initialValue = "OPEN";
                    else if (TaskType.INSPECTION.equals(taskBase.getTaskType())) initialValue = "FLAG";
                    Task task = new Task(taskBase, workOrder, null, initialValue);
                    task.setTaskOrder(taskOrder.getAndIncrement());
                    task.setCompany(workOrder.getCompany());
                    existingTaskBaseIds.add(taskBase.getId());
                    return task;
                })
                .collect(Collectors.toList());
        if (!tasksToCreate.isEmpty()) taskRepository.saveAll(tasksToCreate);
    }

    /** Applies a Request workflow's checklist after approval has created its Work Order. */
    public void addApprovedRequestChecklist(Workflow workflow, Request request, WorkOrder workOrder) {
        if (workflow.getSecondaryConditions().stream().allMatch(condition -> condition.isMetForRequest(request))
                && workflow.getAction() != null
                && com.grash.model.enums.workflow.RequestAction.ADD_CHECKLIST.equals(
                        workflow.getAction().getRequestAction())) {
            addChecklistToWorkOrder(workflow, workOrder);
        }
    }

    public void runRequest(Workflow workflow, Request request) {
        if (!sameCompany(workflow, request)) return;
        if (workflow.getSecondaryConditions().stream().allMatch(workflowCondition -> workflowCondition.isMetForRequest(request))) {
            WorkflowAction action = workflow.getAction();
            switch (action.getRequestAction()) {
                case ADD_CHECKLIST:
                    //TODO
                    return;
                case SEND_REMINDER_EMAIL:
                    //TODO
                    return;
                case ASSIGN_TEAM:
                    if (isTeamCompatibleWithSite(action.getTeam(), request.getCompany(), request.getSite())) {
                        request.setTeam(action.getTeam());
                    } else {
                        log.warn("Workflow {} skipped team assignment for request {} because the team is outside its company or site scope",
                                workflow.getId(), request.getId());
                    }
                    break;
                case ASSIGN_USER:
                    request.setPrimaryUser(action.getUser());
                    break;
                case ASSIGN_ASSET:
                    request.setAsset(action.getAsset());
                    break;
                case ASSIGN_CATEGORY:
                    request.setCategory(action.getWorkOrderCategory());
                    break;
                case ASSIGN_LOCATION:
                    request.setLocation(action.getLocation());
                    break;
                case ASSIGN_PRIORITY:
                    request.setPriority(action.getPriority());
                    break;
                default:
                    break;
            }
            requestRepository.save(request);
        }
    }

    private boolean sameCompany(Workflow workflow, CompanyAudit target) {
        return workflow != null && target != null && workflow.getCompany() != null && target.getCompany() != null
                && workflow.getCompany().getId().equals(target.getCompany().getId());
    }

    private boolean isTeamCompatibleWithSite(Team team, Company company, Site site) {
        if (team == null) return true;
        if (company == null || team.getCompany() == null
                || !company.getId().equals(team.getCompany().getId())) return false;
        return team.getUsers() == null || team.getUsers().stream().allMatch(member ->
                member != null && member.getCompany() != null
                        && company.getId().equals(member.getCompany().getId())
                        && member.canAccessSite(site));
    }

    public void runPurchaseOrder(Workflow workflow, PurchaseOrder purchaseOrder) {
        if (workflow.getSecondaryConditions().stream().allMatch(workflowCondition -> workflowCondition.isMetForPurchaseOrder(purchaseOrder))) {
            WorkflowAction action = workflow.getAction();
            switch (action.getPurchaseOrderAction()) {
                case APPROVE:
                    purchaseOrderApprovalService.respond(
                            purchaseOrder.getId(), purchaseOrder.getCompany().getId(), true);
                    break;
                case REJECT:
                    purchaseOrderApprovalService.respond(
                            purchaseOrder.getId(), purchaseOrder.getCompany().getId(), false);
                    break;
                case ASSIGN_VENDOR:
                    if (!sameCompany(workflow, action.getVendor()) || !sameCompany(workflow, purchaseOrder)) {
                        throw new CustomException("Workflow vendor must belong to the purchase order company",
                                HttpStatus.FORBIDDEN);
                    }
                    purchaseOrder.setVendor(action.getVendor());
                    break;
                case ASSIGN_CATEGORY:
                    if (action.getPurchaseOrderCategory() == null
                            || action.getPurchaseOrderCategory().getCompanySettings() == null
                            || action.getPurchaseOrderCategory().getCompanySettings().getCompany() == null
                            || !action.getPurchaseOrderCategory().getCompanySettings().getCompany().getId()
                            .equals(purchaseOrder.getCompany().getId())
                            || !action.getPurchaseOrderCategory().getCompanySettings().getCompany().getId()
                            .equals(workflow.getCompany().getId())) {
                        throw new CustomException("Workflow category must belong to the purchase order company",
                                HttpStatus.FORBIDDEN);
                    }
                    purchaseOrder.setCategory(action.getPurchaseOrderCategory());
                    break;
                case SEND_REMINDER_EMAIL:
//                    TODO
                    return;
                default:
                    break;
            }
            if (action.getPurchaseOrderAction() != com.grash.model.enums.workflow.PurchaseOrderAction.APPROVE
                    && action.getPurchaseOrderAction() != com.grash.model.enums.workflow.PurchaseOrderAction.REJECT) {
                purchaseOrderRepository.save(purchaseOrder);
            }
        }
    }

    public void runPart(Workflow workflow, Part part) {
        if (workflow.getSecondaryConditions().stream().allMatch(workflowCondition -> workflowCondition.isMetForPart(part))) {
            WorkflowAction action = workflow.getAction();
            switch (action.getPartAction()) {
                case CREATE_PURCHASE_ORDER:
                    //TODO
                    break;
                default:
                    break;
            }
        }
    }

    public void runTask(Workflow workflow, Task task) {
        if (workflow.getSecondaryConditions().stream().allMatch(workflowCondition -> workflowCondition.isMetForTask(task))) {
            WorkflowAction action = workflow.getAction();
            switch (action.getTaskAction()) {
                case CREATE_REQUEST:
                case CREATE_WORK_ORDER:
//                   TODO
                    break;
                case SET_ASSET_STATUS:
                    Asset asset = task.getWorkOrder().getAsset();
                    if (asset != null) {
                        asset.setStatus(action.getAssetStatus());
                        assetRepository.save(asset);
                    }
                    break;
                default:
                    break;
            }
        }
    }

    public void disableWorkflows(Long companyId) {
        Collection<Workflow> workflows = findByCompany(companyId);
        if (!workflows.isEmpty()) {
            Workflow firstWorkflow = Collections.min(workflows, new AuditComparator());
            Collection<Workflow> workflowsToDisable =
                    workflows.stream().filter(workflow -> !workflow.getId().equals(firstWorkflow.getId())).collect(Collectors.toList());
            workflowsToDisable.forEach(workflow -> workflow.setEnabled(false));
            workflowRepository.saveAll(workflowsToDisable);
        }
    }

    public void enableWorkflows(Long companyId) {
        Collection<Workflow> workflows = findByCompany(companyId);
        workflows.forEach(workflow -> workflow.setEnabled(true));
        workflowRepository.saveAll(workflows);
    }
}
