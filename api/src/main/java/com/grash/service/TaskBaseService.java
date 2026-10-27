package com.grash.service;

import com.grash.dto.TaskBaseDTO;
import com.grash.dto.TaskBasePatchDTO;
import com.grash.exception.CustomException;
import com.grash.mapper.TaskBaseMapper;
import com.grash.model.Company;
import com.grash.model.Asset;
import com.grash.model.Meter;
import com.grash.model.TaskBase;
import com.grash.model.TaskOption;
import com.grash.model.User;
import com.grash.repository.TaskBaseRepository;
import com.grash.utils.Sanitizer;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import java.util.Collection;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TaskBaseService {
    private final TaskBaseRepository taskBaseRepository;
    private final CompanyService companyService;
    private final TaskBaseMapper taskBaseMapper;
    private final TaskOptionService taskOptionService;
    private final UserService userService;
    private final MeterService meterService;
    private final AssetService assetService;
    private final EntityManager em;

    @Transactional
    public TaskBase create(TaskBase TaskBase) {
        Sanitizer.sanitizeTaskBase(TaskBase);
        TaskBase taskBase = taskBaseRepository.saveAndFlush(TaskBase);
        em.refresh(taskBase);
        return taskBase;
    }

    @Transactional
    public TaskBase createFromTaskBaseDTO(TaskBaseDTO taskBaseDTO, Company company) {
        TaskBase taskBase = TaskBase.builder()
                .label(taskBaseDTO.getLabel())
                .taskType(taskBaseDTO.getTaskType())
                .build();
        if (taskBaseDTO.getUser() != null) {
            var user = userService.findByIdAndCompany(taskBaseDTO.getUser().getId(), company.getId())
                    .orElseThrow(() -> invalidTaskReference());
            taskBase.setUser(user);
        }
        if (taskBaseDTO.getAsset() != null) {
            var asset = assetService.findByIdAndCompany(taskBaseDTO.getAsset().getId(), company.getId())
                    .orElseThrow(() -> invalidTaskReference());
            taskBase.setAsset(asset);
        }
        if (taskBaseDTO.getMeter() != null) {
            var meter = meterService.findByIdAndCompany(taskBaseDTO.getMeter().getId(), company.getId())
                    .orElseThrow(() -> invalidTaskReference());
            taskBase.setMeter(meter);
        }
        TaskBase savedTaskBase = create(taskBase);

        if (taskBaseDTO.getOptions() != null) {
            taskBaseDTO.getOptions().forEach(option -> {
                if (!option.trim().isEmpty()) {
                    TaskOption taskOption = new TaskOption(option, savedTaskBase);
                    TaskOption savedTaskOption = taskOptionService.create(taskOption);
                    savedTaskBase.getOptions().add(savedTaskOption);
                }
            });
        }
        return savedTaskBase;
    }

    /** Creates an operational task definition after checking each assigned reference
     * against the acting user's site scope. Shared checklist definitions continue to
     * use the company-only overload above.
     */
    @Transactional
    public TaskBase createFromTaskBaseDTO(TaskBaseDTO taskBaseDTO, Company company, User actor) {
        if (actor == null || actor.getCompany() == null || company == null
                || !actor.getCompany().getId().equals(company.getId())) {
            throw invalidTaskReference();
        }
        if (taskBaseDTO.getUser() != null) {
            User assignee = userService.findByIdAndCompany(taskBaseDTO.getUser().getId(), company.getId())
                    .orElseThrow(this::invalidTaskReference);
            if (!canSeeAssignedUser(actor, assignee)) throw invalidTaskReference();
        }
        if (taskBaseDTO.getAsset() != null) {
            Asset asset = assetService.findByIdAndCompany(taskBaseDTO.getAsset().getId(), company.getId())
                    .orElseThrow(this::invalidTaskReference);
            if (!actor.canAccessSite(asset.getSite())) throw invalidTaskReference();
        }
        if (taskBaseDTO.getMeter() != null) {
            Meter meter = meterService.findByIdAndCompany(taskBaseDTO.getMeter().getId(), company.getId())
                    .orElseThrow(this::invalidTaskReference);
            if (meter.getAsset() == null || !actor.canAccessSite(meter.getAsset().getSite()))
                throw invalidTaskReference();
        }
        return createFromTaskBaseDTO(taskBaseDTO, company);
    }

    private boolean canSeeAssignedUser(User actor, User assignee) {
        if (actor.isAllSitesAccess()) return true;
        if (assignee.isAllSitesAccess()) return true;
        return assignee.getSites().stream().anyMatch(actor::canAccessSite);
    }

    private CustomException invalidTaskReference() {
        return new CustomException("task_reference_unavailable", HttpStatus.UNPROCESSABLE_ENTITY);
    }

    public TaskBase update(Long id, TaskBasePatchDTO taskBase) {
        if (taskBaseRepository.existsById(id)) {
            TaskBase savedTaskBase = taskBaseRepository.findById(id).get();
            TaskBase updatedTaskBase = taskBaseMapper.updateTaskBase(savedTaskBase, taskBase);
            Sanitizer.sanitizeTaskBase(updatedTaskBase);
            return taskBaseRepository.save(updatedTaskBase);
        } else throw new CustomException("Not found", HttpStatus.NOT_FOUND);
    }

    public Collection<TaskBase> getAll() {
        return taskBaseRepository.findAll();
    }

    public void delete(Long id) {
        taskBaseRepository.deleteById(id);
    }

    public Optional<TaskBase> findById(Long id) {
        return taskBaseRepository.findById(id);
    }

}

