package com.grash.controller;

import com.grash.dto.SuccessResponse;
import com.grash.dto.TaskBaseDTO;
import com.grash.dto.TaskPatchDTO;
import com.grash.dto.TaskShowDTO;
import com.grash.exception.CustomException;
import com.grash.mapper.TaskMapper;
import com.grash.model.*;
import com.grash.model.enums.workflow.WFMainCondition;
import com.grash.security.CurrentUser;
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

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/tasks")
@Tag(name = "Tasks", description = "Operations on work order tasks")
@RequiredArgsConstructor
@Transactional
public class TaskController {

    private final TaskService taskService;
    private final UserService userService;
    private final WorkOrderService workOrderService;
    private final WorkflowService workflowService;
    private final TaskMapper taskMapper;
    private final PreventiveMaintenanceService preventiveMaintenanceService;

    @GetMapping("/{id}")
    @PreAuthorize("permitAll()")
    public TaskShowDTO getById(@PathVariable("id") Long id, HttpServletRequest req) {
        User user = userService.whoami(req);
        Optional<Task> optionalTask = taskService.findById(id);
        if (optionalTask.isPresent()) {
            Task savedTask = optionalTask.get();
            checkAccessToTask(savedTask, user, true);
            return taskMapper.toShowDto(savedTask);
        } else throw new CustomException("Not found", HttpStatus.NOT_FOUND);
    }

    @GetMapping("/work-order/{id}")
    @PreAuthorize("permitAll()")
    public Collection<TaskShowDTO> getByWorkOrder(@PathVariable("id") Long id, HttpServletRequest req) {
        User user = userService.whoami(req);
        workOrderService.checkAccessToWorkOrderId(id, user);
        return taskService.findByWorkOrder(id).stream()
                .map(taskMapper::toShowDto)
                .collect(Collectors.toList());
    }

    @GetMapping("/preventive-maintenance/{id}")
    @PreAuthorize("permitAll()")
    public Collection<Task> getByPreventiveMaintenance(@PathVariable("id") Long id,
                                                       @Parameter(hidden = true) @CurrentUser User user) {
        preventiveMaintenanceService.getById(id, user);
        return taskService.findByPreventiveMaintenance(id);
    }

    @PatchMapping("/preventive-maintenance/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public Collection<TaskShowDTO> createByPreventiveMaintenance(@Parameter(description = "List of task bases to " +
                                                                         "create") @Valid @RequestBody Collection<TaskBaseDTO> taskBasesReq, @PathVariable("id") Long id,
                                                                 HttpServletRequest req) {
        User user = userService.whoami(req);
        PreventiveMaintenance preventiveMaintenance = preventiveMaintenanceService.getById(id, user);
        if (preventiveMaintenance.canBeEditedBy(user)) {
            List<Task> savedPMTasks = taskService.findByPreventiveMaintenance(id);
            List<Task> resultTasks = taskService.updateEntityTasks(taskBasesReq, savedPMTasks, user,
                    preventiveMaintenance, null);

            return resultTasks.stream()
                    .map(taskMapper::toShowDto)
                    .collect(Collectors.toList());
        } else throw new CustomException("Not found", HttpStatus.NOT_FOUND);
    }

    @PatchMapping("/work-order/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    List<TaskShowDTO> create(@Parameter(description = "List of task bases to create") @Valid @RequestBody List<TaskBaseDTO> taskBasesReq,
                             @PathVariable("id") Long id, HttpServletRequest req) {
        User user = userService.whoami(req);
        WorkOrder workOrder = workOrderService.checkAccessToWorkOrderId(id, user);
        if (workOrder.canBeEditedBy(user)) {
            List<Task> savedWOTasks = taskService.findByWorkOrder(id);

            List<Task> resultTasks = taskService.updateEntityTasks(taskBasesReq, savedWOTasks, user, null, workOrder);

            return resultTasks.stream()
                    .map(taskMapper::toShowDto)
                    .collect(Collectors.toList());
        } else throw new CustomException("Not found", HttpStatus.NOT_FOUND);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public TaskShowDTO patch(@Parameter(description = "Task fields to update") @Valid @RequestBody TaskPatchDTO task,
                             @PathVariable(
                                     "id") Long id,
                             HttpServletRequest req) {
        User user = userService.whoami(req);
        Optional<Task> optionalTask = taskService.findById(id);

        if (optionalTask.isPresent()) {
            checkAccessToTask(optionalTask.get(), user, false);
            Task patchedTask = taskService.update(id, task);
            Collection<Workflow> workflows =
                    workflowService.findByMainConditionAndCompany(WFMainCondition.TASK_UPDATED,
                            user.getCompany().getId());
            workflows.forEach(workflow -> workflowService.runTask(workflow, patchedTask));
            return taskMapper.toShowDto(patchedTask);
        } else throw new CustomException("Task not found", HttpStatus.NOT_FOUND);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public ResponseEntity<SuccessResponse> delete(@PathVariable("id") Long id, HttpServletRequest req) {
        User user = userService.whoami(req);
        Optional<Task> optionalTask = taskService.findById(id);
        if (optionalTask.isPresent()) {
            checkAccessToTask(optionalTask.get(), user, false);
            taskService.delete(id);
            return new ResponseEntity<>(new SuccessResponse(true, "Deleted successfully"),
                    HttpStatus.OK);
        } else throw new CustomException("Task not found", HttpStatus.NOT_FOUND);
    }

    private void checkAccessToTask(Task task, User user, boolean view) {
        boolean hasAccess;

        if (task.getWorkOrder() != null) {
            WorkOrder workOrder = task.getWorkOrder();
            hasAccess = user.getCompany() != null && workOrder.getCompany() != null
                    && user.getCompany().getId().equals(workOrder.getCompany().getId())
                    && user.canAccessSite(workOrder.getSite())
                    && (view ? workOrder.canBeViewedBy(user) : workOrder.canBeEditedBy(user));
        } else {
            PreventiveMaintenance preventiveMaintenance = task.getPreventiveMaintenance();
            hasAccess = preventiveMaintenance != null
                    && user.getCompany() != null
                    && preventiveMaintenance.getCompany() != null
                    && user.getCompany().getId().equals(preventiveMaintenance.getCompany().getId())
                    && user.canAccessSite(preventiveMaintenance.getSite())
                    && (view
                    ? preventiveMaintenance.canBeViewedBy(user)
                    : preventiveMaintenance.canBeEditedBy(user));
        }

        if (!hasAccess) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
    }
}


