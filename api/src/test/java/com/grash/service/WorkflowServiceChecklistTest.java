package com.grash.service;

import com.grash.mapper.WorkflowMapper;
import com.grash.model.*;
import com.grash.model.enums.TaskType;
import com.grash.model.enums.workflow.WorkOrderAction;
import com.grash.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkflowServiceChecklistTest {
    @InjectMocks private WorkflowService workflowService;
    @Mock private WorkflowRepository workflowRepository;
    @Mock private WorkflowMapper workflowMapper;
    @Mock private WorkOrderRepository workOrderRepository;
    @Mock private RequestRepository requestRepository;
    @Mock private AssetRepository assetRepository;
    @Mock private PurchaseOrderRepository purchaseOrderRepository;
    @Mock private TaskRepository taskRepository;

    @Test
    void addsChecklistTasksWithExecutionDefaultsAndStableOrder() {
        Company company = company(7L);
        WorkOrder workOrder = new WorkOrder();
        workOrder.setId(42L);
        workOrder.setCompany(company);
        Task existing = new Task();
        existing.setTaskOrder(3);
        when(taskRepository.findByWorkOrder_IdOrderByTaskOrderAscCreatedAtAscIdAsc(42L))
                .thenReturn(List.of(existing));

        TaskBase subtask = taskBase(11L, company, TaskType.SUBTASK);
        TaskBase inspection = taskBase(12L, company, TaskType.INSPECTION);
        Workflow workflow = workflow(company, checklist(company, subtask, inspection));

        workflowService.runWorkOrder(workflow, workOrder);

        ArgumentCaptor<List<Task>> captor = ArgumentCaptor.forClass(List.class);
        verify(taskRepository).saveAll(captor.capture());
        List<Task> saved = captor.getValue();
        assertEquals(2, saved.size());
        assertEquals(List.of(4, 5), saved.stream().map(Task::getTaskOrder).toList());
        assertEquals(List.of("OPEN", "FLAG"), saved.stream().map(Task::getValue).toList());
        assertTrue(saved.stream().allMatch(task -> task.getWorkOrder() == workOrder));
        assertTrue(saved.stream().allMatch(task -> task.getCompany() == company));
    }

    @Test
    void doesNotDuplicateChecklistTasksWhenWorkflowRunsAgain() {
        Company company = company(7L);
        WorkOrder workOrder = new WorkOrder();
        workOrder.setId(42L);
        workOrder.setCompany(company);
        TaskBase taskBase = taskBase(11L, company, TaskType.SUBTASK);
        Task existing = new Task();
        existing.setTaskBase(taskBase);
        existing.setTaskOrder(0);
        when(taskRepository.findByWorkOrder_IdOrderByTaskOrderAscCreatedAtAscIdAsc(42L))
                .thenReturn(List.of(existing));

        workflowService.runWorkOrder(workflow(company, checklist(company, taskBase)), workOrder);

        verify(taskRepository, never()).saveAll(anyList());
    }

    @Test
    void refusesChecklistFromAnotherCompany() {
        Company company = company(7L);
        WorkOrder workOrder = new WorkOrder();
        workOrder.setId(42L);
        workOrder.setCompany(company);

        workflowService.runWorkOrder(
                workflow(company, checklist(company(8L), taskBase(11L, company(8L), TaskType.SUBTASK))), workOrder);

        verifyNoInteractions(taskRepository);
    }

    private static Workflow workflow(Company company, Checklist checklist) {
        WorkflowAction action = new WorkflowAction();
        action.setWorkOrderAction(WorkOrderAction.ADD_CHECKLIST);
        action.setChecklist(checklist);
        Workflow workflow = new Workflow();
        workflow.setCompany(company);
        workflow.setAction(action);
        return workflow;
    }

    private static Checklist checklist(Company company, TaskBase... taskBases) {
        Checklist checklist = new Checklist();
        checklist.setCompanySettings(new CompanySettings(company));
        checklist.setTaskBases(List.of(taskBases));
        return checklist;
    }

    private static TaskBase taskBase(Long id, Company company, TaskType type) {
        TaskBase taskBase = new TaskBase();
        taskBase.setId(id);
        taskBase.setCompany(company);
        taskBase.setTaskType(type);
        return taskBase;
    }

    private static Company company(Long id) {
        Company company = new Company();
        company.setId(id);
        return company;
    }
}
