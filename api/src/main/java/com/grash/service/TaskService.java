package com.grash.service;

import com.grash.dto.TaskPatchDTO;
import com.grash.dto.TaskBaseDTO;
import com.grash.exception.CustomException;
import com.grash.mapper.TaskMapper;
import com.grash.model.*;
import com.grash.model.enums.TaskType;
import com.grash.repository.TaskRepository;
import com.grash.utils.Sanitizer;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import jakarta.persistence.EntityManager;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService {
    private final TaskRepository taskRepository;
    private final WorkOrderService workOrderService;
    private final CompanyService companyService;
    private final FileService fileService;
    private final TaskMapper taskMapper;
    private final TaskBaseService taskBaseService;
    private final EntityManager em;

    @Transactional
    public Task create(Task Task) {
        Sanitizer.sanitizeTask(Task);
        Task savedTask = taskRepository.saveAndFlush(Task);
        em.refresh(savedTask);
        return savedTask;
    }

    @Transactional
    public Task update(Long id, TaskPatchDTO task) {
        if (taskRepository.existsById(id)) {
            Task savedTask = taskRepository.findById(id).get();
            Task updatedTask = taskMapper.updateTask(savedTask, task);
            Sanitizer.sanitizeTask(updatedTask);
            updatedTask = taskRepository.saveAndFlush(updatedTask);
            em.refresh(updatedTask);
            return updatedTask;
        } else throw new CustomException("Not found", HttpStatus.NOT_FOUND);
    }

    public Collection<Task> getAll() {
        return taskRepository.findAll();
    }

    public void delete(Long id) {
        taskRepository.deleteById(id);
    }

    public Optional<Task> findById(Long id) {
        return taskRepository.findById(id);
    }

    public List<Task> findByWorkOrder(Long id) {
        return taskRepository.findByWorkOrder_IdOrderByTaskOrderAscCreatedAtAscIdAsc(id);
    }

    public List<Task> findByPreventiveMaintenance(Long id) {
        return taskRepository.findByPreventiveMaintenance_IdOrderByTaskOrderAscCreatedAtAscIdAsc(id);
    }

    /**
     * Synchronize a PM/WO task list within its parent update transaction. A task row
     * remains stable when its definition changes so WO execution values and evidence
     * stay attached to the same row.
     */
    @Transactional
    public List<Task> updateEntityTasks(Collection<TaskBaseDTO> taskBasesReq, List<Task> savedTasks,
                                        User user, PreventiveMaintenance preventiveMaintenance,
                                        WorkOrder workOrder) {
        List<TaskBaseDTO> incomingTasks = new ArrayList<>(taskBasesReq);
        List<Task> resultTasks = new ArrayList<>();
        List<Task> matchedTasks = new ArrayList<>();

        for (int taskOrder = 0; taskOrder < incomingTasks.size(); taskOrder++) {
            TaskBaseDTO request = incomingTasks.get(taskOrder);
            Task matchedTask = workOrder != null && request.getWorkOrderTaskId() != null
                    ? savedTasks.stream()
                    .filter(task -> !matchedTasks.contains(task)
                            && task.getId().equals(request.getWorkOrderTaskId()))
                    .findFirst()
                    .orElse(null)
                    : null;
            if (matchedTask == null) {
                matchedTask = savedTasks.stream()
                        .filter(task -> !matchedTasks.contains(task)
                                && tasksMatch(task.getTaskBase(), request))
                        .findFirst()
                        .orElse(null);
            }

            if (matchedTask != null) {
                if (!tasksMatch(matchedTask.getTaskBase(), request)) {
                    matchedTask.setTaskBase(taskBaseService.createFromTaskBaseDTO(request, user.getCompany(), user));
                }
                matchedTasks.add(matchedTask);
                matchedTask.setTaskOrder(taskOrder);
                resultTasks.add(matchedTask);
            } else {
                TaskBase taskBase = taskBaseService.createFromTaskBaseDTO(request, user.getCompany(), user);
                String value = taskBase.getTaskType() == TaskType.SUBTASK ? "OPEN"
                        : taskBase.getTaskType() == TaskType.INSPECTION ? "FLAG" : "";
                Task newTask = new Task(taskBase, workOrder, preventiveMaintenance, value);
                newTask.setTaskOrder(taskOrder);
                Task createdTask = create(newTask);
                resultTasks.add(createdTask);
            }
        }

        if (workOrder != null) {
            savedTasks.stream()
                    .filter(task -> !matchedTasks.contains(task))
                    .filter(this::hasExecutionEvidence)
                    .findFirst()
                    .ifPresent(task -> {
                        throw new CustomException(
                                "Cannot remove a work-order task with a recorded value, notes, or attachments",
                                HttpStatus.CONFLICT);
                    });
        }

        savedTasks.stream()
                .filter(task -> !matchedTasks.contains(task))
                .forEach(task -> delete(task.getId()));
        return resultTasks;
    }

    private boolean tasksMatch(TaskBase saved, TaskBaseDTO request) {
        if (!Objects.equals(saved.getLabel(), request.getLabel())
                || saved.getTaskType() != request.getTaskType()
                || !sameId(saved.getUser(), request.getUser())
                || !sameId(saved.getAsset(), request.getAsset())
                || !sameId(saved.getMeter(), request.getMeter())) {
            return false;
        }
        List<String> savedOptions = saved.getOptions().stream()
                .map(TaskOption::getLabel).sorted().toList();
        List<String> requestedOptions = request.getOptions() == null
                ? List.of() : request.getOptions().stream().sorted().toList();
        return savedOptions.equals(requestedOptions);
    }

    private boolean sameId(User saved, User requested) {
        return saved == null ? requested == null
                : requested != null && Objects.equals(saved.getId(), requested.getId());
    }

    private boolean sameId(Asset saved, Asset requested) {
        return saved == null ? requested == null
                : requested != null && Objects.equals(saved.getId(), requested.getId());
    }

    private boolean sameId(Meter saved, Meter requested) {
        return saved == null ? requested == null
                : requested != null && Objects.equals(saved.getId(), requested.getId());
    }

    private boolean hasExecutionEvidence(Task task) {
        boolean hasRecordedValue = task.getValue() != null && !task.getValue().isBlank()
                && !"OPEN".equals(task.getValue()) && !"FLAG".equals(task.getValue());
        boolean hasNotes = task.getNotes() != null && !task.getNotes().isBlank();
        return hasRecordedValue || hasNotes || (task.getImages() != null && !task.getImages().isEmpty());
    }
}

