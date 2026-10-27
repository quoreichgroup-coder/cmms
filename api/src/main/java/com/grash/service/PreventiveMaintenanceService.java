package com.grash.service;

import com.grash.advancedsearch.FilterField;
import com.grash.advancedsearch.SearchCriteria;
import com.grash.advancedsearch.SpecificationBuilder;
import com.grash.dto.CalendarEvent;
import com.grash.dto.PreventiveMaintenanceCallDTO;
import com.grash.dto.PreventiveMaintenanceCallAnalyticsDTO;
import com.grash.dto.PreventiveMaintenanceCallRescheduleDTO;
import com.grash.dto.PreventiveMaintenanceCallRescheduleRequest;
import com.grash.model.PreventiveMaintenanceCallReschedule;
import com.grash.dto.PreventiveMaintenancePatchDTO;
import com.grash.dto.PreventiveMaintenancePostDTO;
import com.grash.dto.PreventiveMaintenanceShowDTO;
import com.grash.dto.TaskBaseDTO;
import com.grash.dto.cutomField.CustomFieldValuePostDTO;
import com.grash.dto.imports.PreventiveMaintenanceImportDTO;
import com.grash.dto.workOrder.WorkOrderPostDTO;
import com.grash.dto.license.LicenseEntitlement;
import com.grash.exception.CustomException;
import com.grash.mapper.PreventiveMaintenanceMapper;
import com.grash.model.*;
import com.grash.model.enums.*;
import com.grash.dto.workOrder.WorkOrderMiniDTO;

import com.grash.repository.PreventiveMaintenanceRepository;
import com.grash.repository.PreventiveMaintenanceCallAnalyticsRow;
import com.grash.repository.PreventiveMaintenanceMeterCallRepository;
import com.grash.repository.PreventiveMaintenanceCallRescheduleRepository;
import com.grash.repository.PreventiveMaintenancePlanCycleStateRepository;
import com.grash.repository.ReadingRepository;
import com.grash.repository.ScheduleRepository;
import com.grash.repository.SiteRepository;
import com.grash.utils.Helper;
import com.grash.utils.Sanitizer;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.quartz.Scheduler;
import org.quartz.SchedulerException;
import org.quartz.Trigger;
import org.quartz.TriggerKey;
import org.quartz.spi.OperableTrigger;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.JoinType;

import java.util.concurrent.TimeUnit;

import java.time.ZoneId;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

import static com.grash.utils.Consts.usageBasedFreeLimits;

@Service
@RequiredArgsConstructor
@Slf4j
public class PreventiveMaintenanceService {
    private final PreventiveMaintenanceRepository preventiveMaintenanceRepository;
    private final PreventiveMaintenanceMeterCallRepository meterCallRepository;
    private final PreventiveMaintenanceCallRescheduleRepository callRescheduleRepository;
    private final PreventiveMaintenancePlanCycleStateRepository planCycleStateRepository;
    private final ReadingRepository readingRepository;
    private final ScheduleRepository scheduleRepository;
    private final EntityManager em;
    private final ObjectMapper objectMapper;
    private final CustomSequenceService customSequenceService;
    private final Scheduler scheduler;
    private final PreventiveMaintenanceMapper preventiveMaintenanceMapper;
    private final LocationService locationService;
    private final TeamService teamService;
    private final UserService userService;
    private final AssetService assetService;
    private final WorkOrderCategoryService workOrderCategoryService;
    private final ScheduleService scheduleService;
    private final LicenseService licenseService;
    private final CustomFieldValueService customFieldValueService;
    private final WorkOrderService workOrderService;
    private final TaskService taskService;
    private final TaskBaseService taskBaseService;
    private final MeterService meterService;
    private final SiteRepository siteRepository;


    @Transactional
    public PreventiveMaintenance create(PreventiveMaintenancePostDTO preventiveMaintenancePost, User user) {
        if (!user.getRole().getCreatePermissions().contains(PermissionEntity.PREVENTIVE_MAINTENANCES)) {
            throw new CustomException("Access Denied", HttpStatus.FORBIDDEN);
        }
        PreventiveMaintenance preventiveMaintenance = preventiveMaintenanceMapper.toModel(preventiveMaintenancePost);
        if (preventiveMaintenance.getSite() != null)
            preventiveMaintenance.setSite(resolveSite(preventiveMaintenance.getSite(), user.getCompany()));
        if (!user.canAccessSite(preventiveMaintenance.getSite()))
            throw new CustomException("Access denied for the selected site", HttpStatus.FORBIDDEN);
        if (!user.getCompany().getSubscription().getSubscriptionPlan().getFeatures().contains(PlanFeatures.PREVENTIVE_MAINTENANCE)) {
            throw new CustomException("Preventive maintenance feature is not enabled for this subscription plan.",
                    HttpStatus.FORBIDDEN);
        }
        PreventiveMaintenancePlanPolicy.validate(preventiveMaintenancePost.getPlanConfiguration())
                .ifPresent(message -> {
                    throw new CustomException(message, HttpStatus.BAD_REQUEST);
                });
        checkUsageBasedLimit(user.getCompany());
        Company company = user.getCompany();
        Long nextSequence = customSequenceService.getNextPreventiveMaintenanceSequence(company);
        preventiveMaintenance.setCustomId("PM" + String.format("%06d", nextSequence));

        if (!preventiveMaintenancePost.getCustomFields().isEmpty()) {
            setPMCustomFields(preventiveMaintenance, preventiveMaintenancePost.getCustomFields(), company);
        }
        Sanitizer.sanitizePreventiveMaintenance(preventiveMaintenance);
        PreventiveMaintenance savedPM = preventiveMaintenanceRepository.saveAndFlush(preventiveMaintenance);
        em.refresh(savedPM);

        PreventiveMaintenancePlanConfiguration planConfiguration =
                createTasksAndRemapPlanTaskIds(savedPM, preventiveMaintenancePost.getTasks(),
                        preventiveMaintenancePost.getPlanConfiguration(), user.getCompany(), user);
        validatePlanConfiguration(planConfiguration, user.getCompany(),
                preventiveMaintenancePost.getTriggerType() == null ? ScheduleTriggerType.CALENDAR : preventiveMaintenancePost.getTriggerType(),
                preventiveMaintenancePost.getAsset() == null ? null : preventiveMaintenancePost.getAsset().getId());

        Schedule schedule = savedPM.getSchedule();
        ScheduleTriggerType triggerType = preventiveMaintenancePost.getTriggerType() == null
                ? ScheduleTriggerType.CALENDAR : preventiveMaintenancePost.getTriggerType();
        schedule.setDaysOfWeek(triggerType == ScheduleTriggerType.CALENDAR && preventiveMaintenancePost.getDaysOfWeek() != null
                ? preventiveMaintenancePost.getDaysOfWeek() : new ArrayList<>());
        schedule.setRecurrenceBasedOn(triggerType == ScheduleTriggerType.CALENDAR && preventiveMaintenancePost.getRecurrenceBasedOn() != null
                ? preventiveMaintenancePost.getRecurrenceBasedOn() : RecurrenceBasedOn.SCHEDULED_DATE);
        schedule.setRecurrenceType(triggerType == ScheduleTriggerType.CALENDAR && preventiveMaintenancePost.getRecurrenceType() != null
                ? preventiveMaintenancePost.getRecurrenceType() : RecurrenceType.DAILY);
        schedule.setEndsOn(preventiveMaintenancePost.getEndsOn());
        schedule.setStartsOn(triggerType == ScheduleTriggerType.CALENDAR && preventiveMaintenancePost.getStartsOn() != null
                ? preventiveMaintenancePost.getStartsOn() : new Date());
        schedule.setFrequency(triggerType == ScheduleTriggerType.CALENDAR && preventiveMaintenancePost.getFrequency() != null
                ? preventiveMaintenancePost.getFrequency() : 1);
        schedule.setDueDateDelay(preventiveMaintenancePost.getDueDateDelay());
        schedule.setWorkOrderGenerationLeadDays(preventiveMaintenancePost.getWorkOrderGenerationLeadDays() == null
                ? 0 : preventiveMaintenancePost.getWorkOrderGenerationLeadDays());
        schedule.setPlanConfiguration(planConfiguration);
        configureSchedule(schedule, triggerType, preventiveMaintenancePost.getMeterId(),
                preventiveMaintenancePost.getMeterCycleInterval(), preventiveMaintenancePost.getMeterReferenceValue(),
                preventiveMaintenancePost.getMeterEndValue(), user.getCompany(), user, false);
        Schedule savedSchedule = scheduleService.save(schedule);
        em.refresh(savedSchedule);
        em.refresh(savedPM);
        scheduleService.scheduleWorkOrder(savedSchedule);
        syncMeterCallRegister(savedSchedule);
        return savedPM;
    }

    @Transactional
    public PreventiveMaintenance patch(Long id, PreventiveMaintenancePatchDTO preventiveMaintenance, User user) {
        Optional<PreventiveMaintenance> optionalPreventiveMaintenance = preventiveMaintenanceRepository.findById(id);
        if (optionalPreventiveMaintenance.isPresent()) {
            PreventiveMaintenance savedPreventiveMaintenance = optionalPreventiveMaintenance.get();
            if (!user.canAccessSite(savedPreventiveMaintenance.getSite())
                    || (preventiveMaintenance.getSite() != null
                    && !user.canAccessSite(resolveSite(preventiveMaintenance.getSite(), user.getCompany()))))
                throw new CustomException("Access denied for the selected site", HttpStatus.FORBIDDEN);
            if (savedPreventiveMaintenance.canBeEditedBy(user)) {
                if (!user.getCompany().getSubscription().getSubscriptionPlan().getFeatures().contains(PlanFeatures.PREVENTIVE_MAINTENANCE)) {
                    throw new CustomException("Preventive maintenance feature is not enabled for this subscription " +
                            "plan.",
                            HttpStatus.FORBIDDEN);
                }
                if (preventiveMaintenance.getTasks() != null) {
                    List<TaskBaseDTO> requestedTasks = preventiveMaintenance.getTasks();
                    List<Task> persistedTasks = taskService.updateEntityTasks(
                            requestedTasks,
                            taskService.findByPreventiveMaintenance(savedPreventiveMaintenance.getId()),
                            user,
                            savedPreventiveMaintenance,
                            null);
                    remapPlanTaskReferences(preventiveMaintenance.getPlanConfiguration(),
                            requestedTasks, persistedTasks);
                }
                if (preventiveMaintenance.getPlanConfiguration() != null) {
                    validatePlanConfiguration(preventiveMaintenance.getPlanConfiguration(), user.getCompany(),
                            preventiveMaintenance.getTriggerType() == null ? savedPreventiveMaintenance.getSchedule().getTriggerType()
                                    : preventiveMaintenance.getTriggerType(),
                            preventiveMaintenance.getAsset() == null
                                    ? savedPreventiveMaintenance.getAsset() == null ? null : savedPreventiveMaintenance.getAsset().getId()
                                    : preventiveMaintenance.getAsset().getId());
                    validatePlanTaskReferences(
                            preventiveMaintenance.getPlanConfiguration(),
                            taskService.findByPreventiveMaintenance(savedPreventiveMaintenance.getId())
                    );
                    syncPlanCycleStatesForConfigurationChange(
                            savedPreventiveMaintenance.getSchedule(),
                            preventiveMaintenance.getPlanConfiguration()
                    );
                }
                PreventiveMaintenance pmToSave =
                        preventiveMaintenanceMapper.updatePreventiveMaintenance(savedPreventiveMaintenance,
                                preventiveMaintenance);
                pmToSave.setSite(preventiveMaintenance.getSite() == null ? savedPreventiveMaintenance.getSite() :
                        resolveSite(preventiveMaintenance.getSite(), user.getCompany()));
                Schedule schedule = savedPreventiveMaintenance.getSchedule();
                if (preventiveMaintenance.getPlanConfiguration() != null) {
                    schedule.setPlanConfiguration(preventiveMaintenance.getPlanConfiguration());
                }
                if (preventiveMaintenance.getTriggerType() != null) {
                    ScheduleTriggerType requestedType = preventiveMaintenance.getTriggerType();
                    schedule.setEndsOn(preventiveMaintenance.getEndsOn());
                    if (requestedType == ScheduleTriggerType.CALENDAR) {
                        if (preventiveMaintenance.getStartsOn() != null) schedule.setStartsOn(preventiveMaintenance.getStartsOn());
                        if (preventiveMaintenance.getFrequency() != null) schedule.setFrequency(preventiveMaintenance.getFrequency());
                        if (preventiveMaintenance.getRecurrenceType() != null) schedule.setRecurrenceType(preventiveMaintenance.getRecurrenceType());
                        if (preventiveMaintenance.getRecurrenceBasedOn() != null) schedule.setRecurrenceBasedOn(preventiveMaintenance.getRecurrenceBasedOn());
                        if (preventiveMaintenance.getDaysOfWeek() != null) schedule.setDaysOfWeek(preventiveMaintenance.getDaysOfWeek());
                    }
                    if (preventiveMaintenance.getDueDateDelay() != null) schedule.setDueDateDelay(preventiveMaintenance.getDueDateDelay());
                    if (preventiveMaintenance.getWorkOrderGenerationLeadDays() != null) {
                        schedule.setWorkOrderGenerationLeadDays(preventiveMaintenance.getWorkOrderGenerationLeadDays());
                    }
                    configureSchedule(schedule, requestedType, preventiveMaintenance.getMeterId(),
                            preventiveMaintenance.getMeterCycleInterval(), preventiveMaintenance.getMeterReferenceValue(),
                            preventiveMaintenance.getMeterEndValue(), user.getCompany(), user, true);
                }
                if (!preventiveMaintenance.getCustomFields().isEmpty()) {
                    setPMCustomFields(savedPreventiveMaintenance, preventiveMaintenance.getCustomFields(),
                            user.getCompany());
                }
                Sanitizer.sanitizePreventiveMaintenance(pmToSave);
                pmToSave.getSchedule().setDisabled(false);
                PreventiveMaintenance updatedPM =
                        preventiveMaintenanceRepository.saveAndFlush(pmToSave);
                em.refresh(updatedPM);
                if (preventiveMaintenance.getTriggerType() != null || preventiveMaintenance.getPlanConfiguration() != null) {
                    scheduleService.reScheduleWorkOrder(updatedPM.getSchedule());
                    syncMeterCallRegister(updatedPM.getSchedule());
                }
                return updatedPM;
            } else throw new CustomException("Access Denied", HttpStatus.FORBIDDEN);
        } else throw new CustomException("PreventiveMaintenance not found", HttpStatus.NOT_FOUND);
    }

    private void remapPlanTaskReferences(PreventiveMaintenancePlanConfiguration configuration,
                                         List<TaskBaseDTO> requestedTasks,
                                         List<Task> persistedTasks) {
        if (configuration == null || requestedTasks.size() != persistedTasks.size()) return;
        Map<Long, Long> clientToPersistedIds = new HashMap<>();
        for (int i = 0; i < requestedTasks.size(); i++) {
            Long clientId = requestedTasks.get(i).getId();
            Long persistedId = persistedTasks.get(i).getTaskBase().getId();
            if (clientId != null && persistedId != null) clientToPersistedIds.put(clientId, persistedId);
        }
        if (configuration.getMode() == PreventiveMaintenancePlanConfiguration.Mode.STRATEGY) {
            configuration.getPackages().forEach(item -> remapTaskIds(item.getTaskBaseIds(), clientToPersistedIds));
        } else if (configuration.getMode() == PreventiveMaintenancePlanConfiguration.Mode.MULTI_COUNTER) {
            configuration.getCycles().forEach(cycle -> remapTaskIds(cycle.getTaskBaseIds(), clientToPersistedIds));
        }
    }

    private void remapTaskIds(List<Long> taskBaseIds, Map<Long, Long> clientToPersistedIds) {
        for (int i = 0; i < taskBaseIds.size(); i++) {
            Long persistedId = clientToPersistedIds.get(taskBaseIds.get(i));
            if (persistedId != null) taskBaseIds.set(i, persistedId);
        }
    }

    private void validatePlanConfiguration(PreventiveMaintenancePlanConfiguration configuration, Company company,
                                           ScheduleTriggerType triggerType, Long assetId) {
        PreventiveMaintenancePlanPolicy.validate(configuration).ifPresent(message -> {
            throw new CustomException(message, HttpStatus.BAD_REQUEST);
        });
        if (configuration == null || configuration.getMode() == PreventiveMaintenancePlanConfiguration.Mode.SINGLE) return;
        List<Long> taskBaseIds = configuration.getMode() == PreventiveMaintenancePlanConfiguration.Mode.STRATEGY
                ? configuration.getPackages().stream().flatMap(item -> item.getTaskBaseIds().stream()).distinct().toList()
                : configuration.getCycles().stream().flatMap(item -> item.getTaskBaseIds().stream()).distinct().toList();
        Long validCount = em.createQuery("select count(t) from TaskBase t where t.id in :ids and t.company.id = :companyId", Long.class)
                .setParameter("ids", taskBaseIds)
                .setParameter("companyId", company.getId())
                .getSingleResult();
        if (validCount != taskBaseIds.size()) {
            throw new CustomException("The plan references task templates outside this company or templates that no longer exist.",
                    HttpStatus.BAD_REQUEST);
        }
        if (configuration.getMode() == PreventiveMaintenancePlanConfiguration.Mode.MULTI_COUNTER) {
            if (triggerType != ScheduleTriggerType.METER) {
                throw new CustomException("Multi-counter plans must use meter triggering.", HttpStatus.BAD_REQUEST);
            }
            if (assetId == null) {
                throw new CustomException("Choose an asset before configuring meter cycles.", HttpStatus.BAD_REQUEST);
            }
            if (configuration.getCycles().stream().anyMatch(cycle ->
                    cycle.getDimension() != PreventiveMaintenancePlanConfiguration.Dimension.METER)) {
                throw new CustomException("Multi-counter plans currently require meter-based cycles. Calendar cycles belong to a calendar strategy plan.",
                        HttpStatus.BAD_REQUEST);
            }
            List<Long> meterIds = configuration.getCycles().stream().map(PreventiveMaintenancePlanConfiguration.Cycle::getMeterId)
                    .distinct().toList();
            Long meterCount = em.createQuery("select count(m) from Meter m where m.id in :ids and m.company.id = :companyId and m.asset.id = :assetId", Long.class)
                    .setParameter("ids", meterIds)
                    .setParameter("companyId", company.getId())
                    .setParameter("assetId", assetId)
                    .getSingleResult();
            if (meterCount != meterIds.size()) {
                throw new CustomException("Every cycle meter must belong to the plan asset and company.",
                        HttpStatus.BAD_REQUEST);
            }
        }
    }

    private void syncPlanCycleStatesForConfigurationChange(
            Schedule schedule,
            PreventiveMaintenancePlanConfiguration nextConfiguration) {
        PreventiveMaintenancePlanConfiguration currentConfiguration = schedule.getPlanConfiguration();
        if (currentConfiguration == null
                || currentConfiguration.getMode() != PreventiveMaintenancePlanConfiguration.Mode.MULTI_COUNTER
                || nextConfiguration.getMode() != PreventiveMaintenancePlanConfiguration.Mode.MULTI_COUNTER) {
            planCycleStateRepository.deleteBySchedule_Id(schedule.getId());
            return;
        }

        Map<String, PreventiveMaintenancePlanConfiguration.Cycle> nextCycles = nextConfiguration.getCycles().stream()
                .collect(Collectors.toMap(PreventiveMaintenancePlanConfiguration.Cycle::getCode, cycle -> cycle));
        for (PreventiveMaintenancePlanConfiguration.Cycle currentCycle : currentConfiguration.getCycles()) {
            PreventiveMaintenancePlanConfiguration.Cycle nextCycle = nextCycles.get(currentCycle.getCode());
            if (nextCycle == null || !hasSameMeterCycleIdentity(currentCycle, nextCycle)) {
                planCycleStateRepository.deleteBySchedule_IdAndCycleCode(schedule.getId(), currentCycle.getCode());
            }
        }

        if (currentConfiguration.getCombination() != nextConfiguration.getCombination()) {
            List<PreventiveMaintenancePlanCycleState> states = planCycleStateRepository.findBySchedule_Id(schedule.getId());
            states.forEach(state -> state.setPendingDue(false));
            planCycleStateRepository.saveAll(states);
        }
    }

    private boolean hasSameMeterCycleIdentity(
            PreventiveMaintenancePlanConfiguration.Cycle currentCycle,
            PreventiveMaintenancePlanConfiguration.Cycle nextCycle) {
        return currentCycle.getDimension() == nextCycle.getDimension()
                && Objects.equals(currentCycle.getMeterId(), nextCycle.getMeterId())
                && Double.compare(currentCycle.getInterval(), nextCycle.getInterval()) == 0
                && Objects.equals(currentCycle.getReferenceValue(), nextCycle.getReferenceValue())
                && Objects.equals(currentCycle.getEndValue(), nextCycle.getEndValue());
    }

    private PreventiveMaintenancePlanConfiguration createTasksAndRemapPlanTaskIds(
            PreventiveMaintenance preventiveMaintenance, List<TaskBaseDTO> taskBaseDTOs,
            PreventiveMaintenancePlanConfiguration configuration, Company company, User actor) {
        Map<Long, Long> clientToPersistedTaskBaseIds = new HashMap<>();
        List<TaskBaseDTO> requestedTasks = taskBaseDTOs == null ? List.of() : taskBaseDTOs;

        for (int taskOrder = 0; taskOrder < requestedTasks.size(); taskOrder++) {
            TaskBaseDTO taskBaseDTO = requestedTasks.get(taskOrder);
            if (taskBaseDTO == null) {
                throw new CustomException("Preventive maintenance tasks cannot contain null entries.",
                        HttpStatus.BAD_REQUEST);
            }
            if (taskBaseDTO.getId() != null && clientToPersistedTaskBaseIds.containsKey(taskBaseDTO.getId())) {
                throw new CustomException("Preventive maintenance task identifiers must be unique.",
                        HttpStatus.BAD_REQUEST);
            }

            TaskBase taskBase = taskBaseService.createFromTaskBaseDTO(taskBaseDTO, company, actor);
            String initialValue = taskBase.getTaskType() == TaskType.SUBTASK ? "OPEN"
                    : taskBase.getTaskType() == TaskType.INSPECTION ? "FLAG" : "";
            Task task = new Task(taskBase, null, preventiveMaintenance, initialValue);
            task.setTaskOrder(taskOrder);
            task.setCompany(company);
            taskService.create(task);

            if (taskBaseDTO.getId() != null) {
                clientToPersistedTaskBaseIds.put(taskBaseDTO.getId(), taskBase.getId());
            }
        }

        if (configuration == null || configuration.getMode() == PreventiveMaintenancePlanConfiguration.Mode.SINGLE) {
            return configuration;
        }

        List<List<Long>> assignmentLists = configuration.getMode()
                == PreventiveMaintenancePlanConfiguration.Mode.STRATEGY
                ? configuration.getPackages().stream()
                        .map(PreventiveMaintenancePlanConfiguration.Package::getTaskBaseIds).toList()
                : configuration.getCycles().stream()
                        .map(PreventiveMaintenancePlanConfiguration.Cycle::getTaskBaseIds).toList();
        for (List<Long> assignedIds : assignmentLists) {
            for (int i = 0; i < assignedIds.size(); i++) {
                Long persistedId = clientToPersistedTaskBaseIds.get(assignedIds.get(i));
                if (persistedId == null) {
                    throw new CustomException(
                            "Every package or cycle task must be selected in this preventive maintenance.",
                            HttpStatus.BAD_REQUEST);
                }
                assignedIds.set(i, persistedId);
            }
        }
        return configuration;
    }

    private void validatePlanTaskReferences(PreventiveMaintenancePlanConfiguration configuration,
                                            Collection<Task> preventiveMaintenanceTasks) {
        if (configuration == null || configuration.getMode() == null
                || configuration.getMode() == PreventiveMaintenancePlanConfiguration.Mode.SINGLE) return;

        Set<Long> attachedTaskBaseIds = preventiveMaintenanceTasks.stream()
                .map(Task::getTaskBase)
                .filter(Objects::nonNull)
                .map(TaskBase::getId)
                .collect(Collectors.toSet());
        List<Long> assignedTaskBaseIds = configuration.getMode()
                == PreventiveMaintenancePlanConfiguration.Mode.STRATEGY
                ? configuration.getPackages().stream()
                        .flatMap(item -> item.getTaskBaseIds().stream()).distinct().toList()
                : configuration.getCycles().stream()
                        .flatMap(cycle -> cycle.getTaskBaseIds().stream()).distinct().toList();
        if (!attachedTaskBaseIds.containsAll(assignedTaskBaseIds)) {
            throw new CustomException(
                    "Every package or cycle task must be attached to this preventive maintenance.",
                    HttpStatus.BAD_REQUEST);
        }
    }

    private void configureSchedule(Schedule schedule, ScheduleTriggerType triggerType, Long meterId,
                                   Double meterCycleInterval, Double meterReferenceValue, Double meterEndValue,
                                   Company company, User user, boolean allowExistingValues) {
        ScheduleTriggerType effectiveType = triggerType == null ? ScheduleTriggerType.CALENDAR : triggerType;
        schedule.setTriggerType(effectiveType);
        if (effectiveType == ScheduleTriggerType.CALENDAR) {
            schedule.setMeter(null);
            schedule.setMeterCycleInterval(null);
            schedule.setMeterReferenceValue(null);
            schedule.setMeterEndValue(null);
            schedule.setNextMeterValue(null);
            return;
        }

        if (!company.getSubscription().getSubscriptionPlan().getFeatures().contains(PlanFeatures.METER)) {
            throw new CustomException("Meter feature is not enabled for this subscription plan.", HttpStatus.FORBIDDEN);
        }
        Long effectiveMeterId = meterId != null ? meterId : allowExistingValues ? schedule.getMeterId() : null;
        if (effectiveMeterId == null) {
            throw new CustomException("A meter is required for a meter-based maintenance cycle.", HttpStatus.BAD_REQUEST);
        }
        Meter meter = meterService.findById(effectiveMeterId)
                .orElseThrow(() -> new CustomException("Meter not found", HttpStatus.NOT_FOUND));
        if (!Objects.equals(meter.getCompany().getId(), company.getId()) || !meter.canBeViewedBy(user)) {
            throw new CustomException("Access denied to the selected meter.", HttpStatus.FORBIDDEN);
        }
        if (schedule.getPreventiveMaintenance().getAsset() == null || meter.getAsset() == null
                || !Objects.equals(schedule.getPreventiveMaintenance().getAsset().getId(), meter.getAsset().getId())) {
            throw new CustomException("The PM meter must belong to the same asset as the maintenance plan.", HttpStatus.BAD_REQUEST);
        }
        if (meter.getUnit() == null || meter.getUnit().isBlank()) {
            throw new CustomException("The selected meter must have a unit of measure.", HttpStatus.BAD_REQUEST);
        }

        Double effectiveInterval = meterCycleInterval != null ? meterCycleInterval
                : allowExistingValues ? schedule.getMeterCycleInterval() : null;
        Double effectiveReference = meterReferenceValue != null ? meterReferenceValue
                : allowExistingValues ? schedule.getMeterReferenceValue() : null;
        Double effectiveEnd = meterEndValue != null ? meterEndValue
                : allowExistingValues ? schedule.getMeterEndValue() : null;
        if (effectiveInterval == null || !Double.isFinite(effectiveInterval) || effectiveInterval <= 0
                || effectiveReference == null || !Double.isFinite(effectiveReference) || effectiveReference < 0) {
            throw new CustomException("Meter cycle interval must be positive and reference value must be non-negative.",
                    HttpStatus.BAD_REQUEST);
        }
        if (effectiveEnd != null && (!Double.isFinite(effectiveEnd) || effectiveEnd <= effectiveReference)) {
            throw new CustomException("Meter end value must be greater than the reference value.", HttpStatus.BAD_REQUEST);
        }

        boolean cycleChanged = !Objects.equals(schedule.getMeterId(), meter.getId())
                || !Objects.equals(schedule.getMeterCycleInterval(), effectiveInterval)
                || !Objects.equals(schedule.getMeterReferenceValue(), effectiveReference);
        schedule.setMeter(meter);
        schedule.setMeterCycleInterval(effectiveInterval);
        schedule.setMeterReferenceValue(effectiveReference);
        schedule.setMeterEndValue(effectiveEnd);
        double firstDueValue = effectiveReference + effectiveInterval;
        if (!Double.isFinite(firstDueValue)) {
            throw new CustomException("Meter cycle values exceed the supported range.", HttpStatus.BAD_REQUEST);
        }
        if (cycleChanged || schedule.getNextMeterValue() == null) schedule.setNextMeterValue(firstDueValue);
    }

    @Transactional
    public void processMeterCycleReading(Meter meter, Reading reading) {
        if (!meter.getCompany().getSubscription().getSubscriptionPlan().getFeatures().contains(PlanFeatures.METER)
                || !meter.getCompany().getSubscription().getSubscriptionPlan().getFeatures().contains(PlanFeatures.PREVENTIVE_MAINTENANCE)) {
            return;
        }
        Collection<Schedule> schedules = scheduleRepository.findByMeter_IdAndTriggerTypeAndDisabledFalseOrderById(
                meter.getId(), ScheduleTriggerType.METER);
        Collection<Schedule> multiCounterSchedules = scheduleRepository
                .findMultiCounterSchedulesByCompanyAndMeterId(meter.getCompany().getId(), meter.getId());
        Optional<Reading> latest = readingRepository.findFirstByMeter_IdOrderByCreatedAtDescIdDesc(meter.getId());
        if (latest.isEmpty() || !Objects.equals(latest.get().getId(), reading.getId())) return;
        for (Schedule schedule : multiCounterSchedules) {
            PreventiveMaintenancePlanConfiguration plan = schedule.getPlanConfiguration();
            if (plan != null && plan.getMode() == PreventiveMaintenancePlanConfiguration.Mode.MULTI_COUNTER) {
                processMultiCounterReading(schedule, meter, reading, plan);
            }
        }
        for (Schedule schedule : schedules) {
            PreventiveMaintenancePlanConfiguration plan = schedule.getPlanConfiguration();
            if (plan != null && plan.getMode() == PreventiveMaintenancePlanConfiguration.Mode.MULTI_COUNTER) continue;
            if (schedule.getEndsOn() != null && schedule.getEndsOn().before(new Date())) {
                schedule.setDisabled(true);
                scheduleRepository.save(schedule);
                syncMeterCallRegister(schedule);
                continue;
            }
            Double dueValue = schedule.getNextMeterValue();
            if (dueValue == null || reading.getValue() < dueValue) continue;
            if (schedule.getMeterEndValue() != null && dueValue > schedule.getMeterEndValue()) {
                schedule.setDisabled(true);
                scheduleRepository.save(schedule);
                syncMeterCallRegister(schedule);
                continue;
            }
            if (meterCallRepository.existsBySchedule_IdAndReading_Id(schedule.getId(), reading.getId())) continue;

            List<Long> packageTaskIds = null;
            if (plan != null && plan.getMode() == PreventiveMaintenancePlanConfiguration.Mode.STRATEGY) {
                long cycle = PreventiveMaintenancePlanPolicy.meterCycleNumber(
                        schedule.getMeterReferenceValue(), schedule.getMeterCycleInterval(), dueValue);
                List<PreventiveMaintenancePlanConfiguration.Package> duePackages =
                        PreventiveMaintenancePlanPolicy.duePackages(plan, cycle);
                packageTaskIds = duePackages.stream()
                        .flatMap(item -> item.getTaskBaseIds().stream()).filter(Objects::nonNull).distinct().toList();
                if (duePackages.isEmpty()) {
                    PreventiveMaintenanceMeterCall skipped = meterCallRepository
                            .findBySchedule_IdAndDueValue(schedule.getId(), dueValue)
                            .orElseGet(PreventiveMaintenanceMeterCall::new);
                    skipped.setSchedule(schedule);
                    skipped.setReading(reading);
                    skipped.setDueValue(dueValue);
                    skipped.setCallType(ScheduleTriggerType.METER);
                    skipped.setReadingValue(reading.getValue());
                    skipped.setStatus(PreventiveMaintenanceCallStatus.IGNORED);
                    meterCallRepository.saveAndFlush(skipped);
                    advanceMeterThreshold(schedule, dueValue);
                    syncMeterCallRegister(schedule);
                    continue;
                }
            }

            WorkOrder workOrder = createWorkOrderFromPreventiveMaintenance(
                    schedule.getPreventiveMaintenance(), packageTaskIds);
            PreventiveMaintenanceMeterCall call = meterCallRepository
                    .findBySchedule_IdAndDueValue(schedule.getId(), dueValue)
                    .orElseGet(PreventiveMaintenanceMeterCall::new);
            call.setSchedule(schedule);
            call.setReading(reading);
            call.setWorkOrder(workOrder);
            call.setDueValue(dueValue);
            call.setCallType(ScheduleTriggerType.METER);
            call.setReadingValue(reading.getValue());
            call.setStatus(PreventiveMaintenanceCallStatus.GENERATED);
            meterCallRepository.saveAndFlush(call);

            advanceMeterThreshold(schedule, dueValue);
            syncMeterCallRegister(schedule);
        }
    }

    private void processMultiCounterReading(Schedule schedule, Meter meter, Reading reading,
                                             PreventiveMaintenancePlanConfiguration plan) {
        if (schedule.isDisabled() || (schedule.getEndsOn() != null && schedule.getEndsOn().before(new Date()))
                || meter == null) return;
        List<PreventiveMaintenancePlanConfiguration.Cycle> cycles = plan.getCycles();
        List<PreventiveMaintenancePlanConfiguration.Cycle> newlyDue = new ArrayList<>();
        Map<String, PreventiveMaintenancePlanCycleState> states = new HashMap<>();
        for (PreventiveMaintenancePlanConfiguration.Cycle cycle : cycles) {
            PreventiveMaintenancePlanCycleState state = planCycleStateRepository
                    .findBySchedule_IdAndCycleCode(schedule.getId(), cycle.getCode())
                    .orElseGet(() -> {
                        PreventiveMaintenancePlanCycleState fresh = new PreventiveMaintenancePlanCycleState();
                        fresh.setSchedule(schedule);
                        fresh.setCycleCode(cycle.getCode());
                        return fresh;
                    });
            states.put(cycle.getCode(), state);
            if (cycle.getDimension() != PreventiveMaintenancePlanConfiguration.Dimension.METER
                    || !Objects.equals(cycle.getMeterId(), meter.getId())) {
                if (state.getId() == null) planCycleStateRepository.save(state);
                continue;
            }
            long currentOrdinal = PreventiveMaintenancePlanPolicy.meterCycleNumber(
                    cycle.getReferenceValue(), cycle.getInterval(), reading.getValue());
            if (cycle.getEndValue() != null
                    && cycle.getReferenceValue() + (currentOrdinal * cycle.getInterval()) > cycle.getEndValue()) {
                continue;
            }
            if (currentOrdinal > state.getLastTriggeredOrdinal()) {
                state.setLastTriggeredOrdinal(currentOrdinal);
                state.setPendingDue(true);
                planCycleStateRepository.save(state);
                newlyDue.add(cycle);
            } else if (state.getId() == null) {
                planCycleStateRepository.save(state);
            }
        }
        if (newlyDue.isEmpty()) return;

        List<PreventiveMaintenancePlanConfiguration.Cycle> triggered;
        if (plan.getCombination() == PreventiveMaintenancePlanConfiguration.Combination.OR) {
            triggered = newlyDue;
        } else {
            boolean allPending = cycles.stream().allMatch(cycle -> states.get(cycle.getCode()).isPendingDue());
            if (!allPending) return;
            triggered = cycles;
        }
        if (meterCallRepository.existsBySchedule_IdAndReading_Id(schedule.getId(), reading.getId())) return;

        List<Long> taskBaseIds = triggered.stream().flatMap(cycle -> cycle.getTaskBaseIds().stream())
                .filter(Objects::nonNull).distinct().toList();
        WorkOrder workOrder = createWorkOrderFromPreventiveMaintenance(schedule.getPreventiveMaintenance(), taskBaseIds);
        PreventiveMaintenanceMeterCall call = new PreventiveMaintenanceMeterCall();
        call.setSchedule(schedule);
        call.setReading(reading);
        call.setWorkOrder(workOrder);
        call.setCallType(ScheduleTriggerType.METER);
        call.setReadingValue(reading.getValue());
        // Multi-counter calls are identified by their source reading and do not
        // occupy a single counter's threshold value.
        call.setDueValue(null);
        List<PreventiveMaintenancePlanConfiguration.Cycle> snapshotCycles = triggered.stream()
                .sorted(Comparator.comparing(PreventiveMaintenancePlanConfiguration.Cycle::getCode))
                .toList();
        call.setTriggeredCycleCodes(snapshotCycles.stream()
                .map(PreventiveMaintenancePlanConfiguration.Cycle::getCode).collect(Collectors.joining(",")));
        try {
            call.setTriggeredCycleNames(objectMapper.writeValueAsString(snapshotCycles.stream()
                    .map(PreventiveMaintenancePlanConfiguration.Cycle::getName).toList()));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to snapshot preventive maintenance cycle names", exception);
        }
        call.setStatus(PreventiveMaintenanceCallStatus.GENERATED);
        meterCallRepository.saveAndFlush(call);
        if (plan.getCombination() == PreventiveMaintenancePlanConfiguration.Combination.AND) {
            states.values().forEach(state -> state.setPendingDue(false));
            planCycleStateRepository.saveAll(states.values());
        }
    }

    private void advanceMeterThreshold(Schedule schedule, double dueValue) {
        double followingValue = dueValue + schedule.getMeterCycleInterval();
        if (!Double.isFinite(followingValue)) {
            schedule.setDisabled(true);
            schedule.setNextMeterValue(dueValue);
        } else if (schedule.getMeterEndValue() != null && followingValue > schedule.getMeterEndValue()) {
            schedule.setDisabled(true);
            schedule.setNextMeterValue(followingValue);
        } else {
            schedule.setNextMeterValue(followingValue);
        }
        scheduleRepository.save(schedule);
    }

    private void syncMeterCallRegister(Schedule schedule) {
            meterCallRepository.deleteBySchedule_IdAndCallTypeAndStatus(schedule.getId(), ScheduleTriggerType.METER,
                    PreventiveMaintenanceCallStatus.PLANNED);
        PreventiveMaintenancePlanConfiguration plan = schedule.getPlanConfiguration();
        if (plan != null && plan.getMode() == PreventiveMaintenancePlanConfiguration.Mode.MULTI_COUNTER) return;
        if (schedule.isDisabled() || schedule.getTriggerType() != ScheduleTriggerType.METER
                || (schedule.getEndsOn() != null && !schedule.getEndsOn().after(new Date()))
                || schedule.getNextMeterValue() == null || schedule.getMeterCycleInterval() == null) return;

        double dueValue = schedule.getNextMeterValue();
        long cycleNumber = PreventiveMaintenancePlanPolicy.meterCycleNumber(
                schedule.getMeterReferenceValue(), schedule.getMeterCycleInterval(), dueValue);
        for (int index = 0; index < 12; index++) {
            if (!Double.isFinite(dueValue)
                    || (schedule.getMeterEndValue() != null && dueValue > schedule.getMeterEndValue())) break;
            boolean scheduled = plan == null
                    || plan.getMode() != PreventiveMaintenancePlanConfiguration.Mode.STRATEGY
                    || !PreventiveMaintenancePlanPolicy.duePackages(plan, cycleNumber).isEmpty();
            if (scheduled) {
            PreventiveMaintenanceMeterCall call = new PreventiveMaintenanceMeterCall();
            call.setSchedule(schedule);
            call.setDueValue(dueValue);
            call.setStatus(PreventiveMaintenanceCallStatus.PLANNED);
            meterCallRepository.save(call);
            }
            dueValue += schedule.getMeterCycleInterval();
            cycleNumber++;
        }
    }

    @Transactional(readOnly = true)
    public Page<PreventiveMaintenanceCallDTO> getMeterCallHistory(Long id, User user, int page, int size) {
        PreventiveMaintenance pm = findByIdAndCompany(id, user.getCompany().getId())
                .orElseThrow(() -> new CustomException("PreventiveMaintenance not found", HttpStatus.NOT_FOUND));
        checkAccessToPreventiveMaintenance(user, pm);
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 100);
        if (pm.getSchedule() == null || (pm.getSchedule().getTriggerType() == ScheduleTriggerType.METER
                && !user.getCompany().getSubscription().getSubscriptionPlan().getFeatures().contains(PlanFeatures.METER))) {
            return Page.empty(PageRequest.of(safePage, safeSize));
        }
        Page<PreventiveMaintenanceMeterCall> calls = meterCallRepository
                .findBySchedule_PreventiveMaintenance_IdOrderByDueDateAscDueValueAsc(
                        id, PageRequest.of(safePage, safeSize));
        List<Long> callIds = calls.getContent().stream().map(PreventiveMaintenanceMeterCall::getId).toList();
        Map<Long, List<PreventiveMaintenanceCallReschedule>> historyByCall = callIds.isEmpty()
                ? Collections.emptyMap()
                : callRescheduleRepository.findByCall_IdInOrderByCreatedAtAsc(callIds).stream()
                        .collect(Collectors.groupingBy(event -> event.getCall().getId()));
        return calls.map(call -> toMeterCallDTO(call, historyByCall.getOrDefault(call.getId(), Collections.emptyList())));
    }

    @Transactional(readOnly = true)
    public List<PreventiveMaintenanceCallAnalyticsDTO> getCallAnalytics(LocalDate startDate, LocalDate endDate, User user) {
        if (startDate == null || endDate == null || endDate.isBefore(startDate)
                || ChronoUnit.DAYS.between(startDate, endDate) > 366) {
            throw new CustomException("Invalid analytics date range", HttpStatus.BAD_REQUEST);
        }
        if (!user.getRole().getViewPermissions().contains(PermissionEntity.PREVENTIVE_MAINTENANCES)) {
            throw new CustomException("Access Denied", HttpStatus.FORBIDDEN);
        }
        Company company = user.getCompany();
        if (!company.getSubscription().getSubscriptionPlan().getFeatures()
                .contains(PlanFeatures.PREVENTIVE_MAINTENANCE)) {
            throw new CustomException("Preventive maintenance feature is not enabled", HttpStatus.FORBIDDEN);
        }
        ZoneId zone = ZoneId.of(company.getCompanySettings().getGeneralPreferences().getTimeZone());
        Date start = Date.from(startDate.atStartOfDay(zone).toInstant());
        Date endExclusive = Date.from(endDate.plusDays(1).atStartOfDay(zone).toInstant());
        boolean meterEnabled = company.getSubscription().getSubscriptionPlan().getFeatures().contains(PlanFeatures.METER);
        List<PreventiveMaintenanceCallAnalyticsRow> analyticsRows;
        if (user.isAllSitesAccess()) {
            analyticsRows = meterCallRepository.aggregateCallsByStatusAndType(company.getId(), start, endExclusive);
        } else {
            List<Long> siteIds = user.getSites().stream().map(Site::getId).toList();
            if (siteIds.isEmpty()) siteIds = List.of(-1L);
            analyticsRows = meterCallRepository.aggregateCallsByStatusAndTypeForSites(
                    company.getId(), siteIds, start, endExclusive);
        }
        return analyticsRows.stream()
                .filter(row -> meterEnabled || row.getCallType() != ScheduleTriggerType.METER)
                .map(row -> new PreventiveMaintenanceCallAnalyticsDTO(row.getStatus(), row.getCallType(), row.getCount()))
                .toList();
    }

    private PreventiveMaintenanceCallDTO toMeterCallDTO(PreventiveMaintenanceMeterCall call,
                                                         List<PreventiveMaintenanceCallReschedule> history) {
        PreventiveMaintenanceCallDTO dto = new PreventiveMaintenanceCallDTO();
        dto.setId(call.getId());
        dto.setDueValue(call.getDueValue());
        dto.setOriginalDueDate(call.getDueDate());
        dto.setRescheduledFor(call.getRescheduledFor());
        dto.setDueDate(call.getRescheduledFor() == null ? call.getDueDate() : call.getRescheduledFor());
        dto.setCallType(call.getCallType() == null ? null : call.getCallType().name());
        dto.setUnit(call.getSchedule().getMeter() == null ? null : call.getSchedule().getMeter().getUnit());
        dto.setReadingValue(call.getReadingValue());
        dto.setTriggeredCycleCodes(call.getTriggeredCycleCodes() == null || call.getTriggeredCycleCodes().isBlank()
                ? List.of() : Arrays.asList(call.getTriggeredCycleCodes().split(",")));
        dto.setTriggeredCycleNames(readTriggeredCycleNames(call.getTriggeredCycleNames()));
        dto.setCreatedAt(call.getCreatedAt());
        PreventiveMaintenanceCallStatus status = call.getStatus();
        WorkOrder workOrder = call.getWorkOrder();
        if (status == PreventiveMaintenanceCallStatus.PLANNED && call.getDueDate() != null
                && call.getDueDate().before(new Date())) status = PreventiveMaintenanceCallStatus.DUE;
        if (status == PreventiveMaintenanceCallStatus.GENERATED && workOrder != null
                && workOrder.getStatus() == Status.COMPLETE) status = PreventiveMaintenanceCallStatus.COMPLETED;
        dto.setStatus(status);
        dto.setRescheduleHistory(history.stream().map(event -> {
            PreventiveMaintenanceCallRescheduleDTO eventDTO = new PreventiveMaintenanceCallRescheduleDTO();
            eventDTO.setId(event.getId());
            eventDTO.setPreviousDueDate(event.getPreviousDueDate());
            eventDTO.setRescheduledFor(event.getRescheduledFor());
            eventDTO.setReason(event.getReason());
            eventDTO.setActorUserId(event.getActorUserId());
            eventDTO.setActorName(event.getActorName());
            eventDTO.setCreatedAt(event.getCreatedAt());
            return eventDTO;
        }).collect(Collectors.toList()));
        if (workOrder != null) {
            WorkOrderMiniDTO mini = new WorkOrderMiniDTO();
            mini.setId(workOrder.getId());
            mini.setTitle(workOrder.getTitle());
            mini.setCustomId(workOrder.getCustomId());
            mini.setStatus(workOrder.getStatus());
            mini.setDueDate(workOrder.getDueDate());
            mini.setCreatedAt(workOrder.getCreatedAt());
            dto.setWorkOrder(mini);
        }
        return dto;
    }

    private List<String> readTriggeredCycleNames(String snapshot) {
        if (snapshot == null || snapshot.isBlank()) return List.of();
        try {
            return objectMapper.readValue(snapshot, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException exception) {
            log.warn("Unable to read preventive maintenance cycle name snapshot for an existing call");
            return List.of();
        }
    }

    @Transactional
    public WorkOrder createWorkOrderFromPreventiveMaintenance(PreventiveMaintenance preventiveMaintenance) {
        return createWorkOrderFromPreventiveMaintenance(preventiveMaintenance, null);
    }

    @Transactional
    public WorkOrder createWorkOrderFromPreventiveMaintenance(PreventiveMaintenance preventiveMaintenance,
                                                               Collection<Long> taskBaseIds) {
        WorkOrderPostDTO workOrder = workOrderService.getWorkOrderFromWorkOrderBase(preventiveMaintenance);
        workOrder.getCustomFields().removeIf(customFieldValue -> !workOrder.getCustomFieldValues()
                .stream().filter(customFieldValue1 -> customFieldValue1.getCustomField().getId().equals(customFieldValue.getId()))
                .findFirst().get().getCustomField().isCopyOnRepeat());

        Collection<Task> tasks = taskService.findByPreventiveMaintenance(preventiveMaintenance.getId());
        workOrder.setParentPreventiveMaintenance(preventiveMaintenance);

        Schedule schedule = preventiveMaintenance.getSchedule();
        if (schedule.getDueDateDelay() != null) {
            workOrder.setDueDate(Helper.incrementDays(new Date(), schedule.getDueDateDelay()));
        }

        WorkOrder savedWorkOrder = workOrderService.create(workOrder, preventiveMaintenance.getCompany());

        tasks.stream()
                .filter(task -> taskBaseIds == null || taskBaseIds.contains(task.getTaskBase().getId()))
                .forEach(task -> {
            Task copiedTask = new Task(task.getTaskBase(), savedWorkOrder, null, task.getValue());
            copiedTask.setTaskOrder(task.getTaskOrder());
            copiedTask.setCompany(preventiveMaintenance.getCompany());
            taskService.create(copiedTask);
        });

        return savedWorkOrder;
    }

    @Transactional
    public WorkOrder createScheduledWorkOrder(PreventiveMaintenance preventiveMaintenance, Date scheduledFor) {
        return createScheduledWorkOrder(preventiveMaintenance, scheduledFor, false);
    }

    @Transactional
    public WorkOrder createScheduledWorkOrder(PreventiveMaintenance preventiveMaintenance, Date scheduledFor,
                                               boolean deferredOccurrence) {
        Schedule schedule = preventiveMaintenance.getSchedule();
        Date occurrenceDate = scheduledFor == null ? new Date() : scheduledFor;
        Optional<PreventiveMaintenanceMeterCall> existing = meterCallRepository
                .findBySchedule_IdAndDueDate(schedule.getId(), occurrenceDate);
        if (existing.isPresent()) {
            PreventiveMaintenanceMeterCall call = existing.get();
            if (call.getWorkOrder() != null) return call.getWorkOrder();
            if (call.getStatus() == PreventiveMaintenanceCallStatus.IGNORED) return null;
            if (call.getStatus() == PreventiveMaintenanceCallStatus.RESCHEDULED && !deferredOccurrence) return null;
            if (deferredOccurrence && call.getStatus() != PreventiveMaintenanceCallStatus.RESCHEDULED) return null;
        } else if (deferredOccurrence) {
            return null;
        }

        PreventiveMaintenancePlanConfiguration plan = schedule.getPlanConfiguration();
        List<Long> taskBaseIds = null;
        if (plan != null && plan.getMode() == PreventiveMaintenancePlanConfiguration.Mode.STRATEGY) {
            ZoneId zone = ZoneId.of(preventiveMaintenance.getCompany().getCompanySettings()
                    .getGeneralPreferences().getTimeZone());
            long cycle = PreventiveMaintenancePlanPolicy.calendarCycleNumber(schedule, occurrenceDate, zone);
            List<PreventiveMaintenancePlanConfiguration.Package> duePackages =
                    PreventiveMaintenancePlanPolicy.duePackages(plan, cycle);
            if (duePackages.isEmpty()) {
                PreventiveMaintenanceMeterCall skipped = existing.orElseGet(PreventiveMaintenanceMeterCall::new);
                skipped.setSchedule(schedule);
                skipped.setDueDate(occurrenceDate);
                skipped.setCallType(ScheduleTriggerType.CALENDAR);
                skipped.setStatus(PreventiveMaintenanceCallStatus.IGNORED);
                meterCallRepository.saveAndFlush(skipped);
                scheduleService.refreshCalendarCallRegister(schedule);
                return null;
            }
            taskBaseIds = duePackages.stream().flatMap(item -> item.getTaskBaseIds().stream())
                    .filter(Objects::nonNull).distinct().toList();
        }
        WorkOrder workOrder = createWorkOrderFromPreventiveMaintenance(preventiveMaintenance, taskBaseIds);
        PreventiveMaintenanceMeterCall call = existing.orElseGet(PreventiveMaintenanceMeterCall::new);
        call.setSchedule(schedule);
        call.setDueDate(occurrenceDate);
        call.setCallType(ScheduleTriggerType.CALENDAR);
        call.setWorkOrder(workOrder);
        call.setStatus(PreventiveMaintenanceCallStatus.GENERATED);
        meterCallRepository.saveAndFlush(call);
        scheduleService.refreshCalendarCallRegister(schedule);
        return workOrder;
    }

    @Transactional
    public PreventiveMaintenanceCallDTO rescheduleCalendarCall(Long pmId, Long callId,
            PreventiveMaintenanceCallRescheduleRequest request, User user) {
        PreventiveMaintenanceMeterCall call = meterCallRepository
                .findByIdAndSchedule_PreventiveMaintenance_Company_Id(callId, user.getCompany().getId())
                .orElseThrow(() -> new CustomException("Preventive maintenance call not found", HttpStatus.NOT_FOUND));
        PreventiveMaintenance pm = call.getSchedule().getPreventiveMaintenance();
        if (!pm.getId().equals(pmId)) {
            throw new CustomException("Preventive maintenance call not found", HttpStatus.NOT_FOUND);
        }
        if (!pm.canBeEditedBy(user) || !user.canAccessSite(pm.getSite())) {
            throw new CustomException("Access Denied", HttpStatus.FORBIDDEN);
        }
        if (call.getCallType() != ScheduleTriggerType.CALENDAR || call.getWorkOrder() != null
                || (call.getStatus() != PreventiveMaintenanceCallStatus.PLANNED
                && call.getStatus() != PreventiveMaintenanceCallStatus.RESCHEDULED
                && !(call.getStatus() == PreventiveMaintenanceCallStatus.DUE
                && call.getDueDate() != null && call.getDueDate().before(new Date())))) {
            throw new CustomException("Only ungenerated calendar calls can be rescheduled.", HttpStatus.CONFLICT);
        }
        Date newDueDate = request.getRescheduledFor();
        if (newDueDate == null || !newDueDate.after(new Date())) {
            throw new CustomException("The new occurrence date must be in the future.", HttpStatus.BAD_REQUEST);
        }
        if (request.getReason() == null || request.getReason().isBlank()) {
            throw new CustomException("A reason is required to reschedule a call.", HttpStatus.BAD_REQUEST);
        }

        Date previousDueDate = call.getRescheduledFor() == null ? call.getDueDate() : call.getRescheduledFor();
        PreventiveMaintenanceCallReschedule event = new PreventiveMaintenanceCallReschedule();
        event.setCall(call);
        event.setPreviousDueDate(previousDueDate);
        event.setRescheduledFor(newDueDate);
        event.setReason(request.getReason().trim());
        event.setActorUserId(user.getId());
        event.setActorName((user.getFirstName() + " " + user.getLastName()).trim());
        call.setRescheduledFor(newDueDate);
        call.setStatus(PreventiveMaintenanceCallStatus.RESCHEDULED);
        meterCallRepository.saveAndFlush(call);
        callRescheduleRepository.saveAndFlush(event);
        scheduleService.scheduleDeferredOccurrence(call);
        scheduleService.refreshCalendarCallRegister(call.getSchedule());
        return toMeterCallDTO(call, List.of(event));
    }

    @Transactional
    public WorkOrder triggerWorkOrder(Long id, User user) {
        if (!(user.getRole().getCreatePermissions().contains(PermissionEntity.WORK_ORDERS))) {
            throw new CustomException("Access Denied", HttpStatus.FORBIDDEN);
        }
        PreventiveMaintenance preventiveMaintenance = findByIdAndCompany(id, user.getCompany().getId())
                .orElseThrow(() -> new CustomException("PreventiveMaintenance not found", HttpStatus.NOT_FOUND));
        checkAccessToPreventiveMaintenance(user, preventiveMaintenance);
        return createWorkOrderFromPreventiveMaintenance(preventiveMaintenance);
    }

    public List<WorkOrder> getRecentWorkOrders(Long id, User user) {
        PreventiveMaintenance pm = findByIdAndCompany(id, user.getCompany().getId())
                .orElseThrow(() -> new CustomException("PreventiveMaintenance not found", HttpStatus.NOT_FOUND));
        checkAccessToPreventiveMaintenance(user, pm);
        return workOrderService.findLastByPM(id, 10).stream().collect(Collectors.toList());
    }

    public Page<WorkOrder> getWorkOrderHistory(Long id, User user, int page, int size) {
        PreventiveMaintenance pm = findByIdAndCompany(id, user.getCompany().getId())
                .orElseThrow(() -> new CustomException("PreventiveMaintenance not found", HttpStatus.NOT_FOUND));
        checkAccessToPreventiveMaintenance(user, pm);
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 100);
        return workOrderService.findPMWorkOrderHistory(id, safePage, safeSize);
    }

    private void checkAccessToPreventiveMaintenance(User user, PreventiveMaintenance preventiveMaintenance) {
        if (!preventiveMaintenance.canBeViewedBy(user) || !user.canAccessSite(preventiveMaintenance.getSite())) {
            throw new CustomException("Access Denied", HttpStatus.FORBIDDEN);
        }
    }

    private void setPMCustomFields(PreventiveMaintenance preventiveMaintenance,
                                   List<CustomFieldValuePostDTO> customFieldValuePostDTOS,
                                   Company company) {
        customFieldValueService.setCustomFields(
                preventiveMaintenance,
                preventiveMaintenance.getCustomFieldValues(),
                customFieldValuePostDTOS,
                company,
                CustomFieldEntityType.WORK_ORDER,
                cfv -> cfv.setPreventiveMaintenance(preventiveMaintenance)
        );
    }

    public Collection<PreventiveMaintenance> getAll() {
        return preventiveMaintenanceRepository.findAll();
    }

    @Transactional
    public void deleteByIdAndUser(Long id, User user) {
        Optional<PreventiveMaintenance> optionalPreventiveMaintenance =
                preventiveMaintenanceRepository.findByIdAndCompany_Id(id, user.getCompany().getId());
        if (optionalPreventiveMaintenance.isPresent()) {
            PreventiveMaintenance savedPreventiveMaintenance = optionalPreventiveMaintenance.get();
            if (savedPreventiveMaintenance.canBeDeletedBy(user)
                    && user.canAccessSite(savedPreventiveMaintenance.getSite())) {
                scheduleService.stopScheduleJobs(savedPreventiveMaintenance.getSchedule().getId());
                preventiveMaintenanceRepository.deleteById(id);
            } else throw new CustomException("Access Denied", HttpStatus.FORBIDDEN);
        } else throw new CustomException("PreventiveMaintenance not found", HttpStatus.NOT_FOUND);
    }

    public Optional<PreventiveMaintenance> findById(Long id) {
        return preventiveMaintenanceRepository.findById(id);
    }

    public PreventiveMaintenance getById(Long id, User user) {
        Optional<PreventiveMaintenance> optionalPreventiveMaintenance = findByIdAndCompany(
                id, user.getCompany().getId());
        if (optionalPreventiveMaintenance.isPresent()) {
            PreventiveMaintenance savedPreventiveMaintenance = optionalPreventiveMaintenance.get();
            checkAccessToPreventiveMaintenance(user, savedPreventiveMaintenance);
            return savedPreventiveMaintenance;
        } else throw new CustomException("Not found", HttpStatus.NOT_FOUND);
    }

    public Collection<PreventiveMaintenance> findByCompany(Long id) {
        return preventiveMaintenanceRepository.findByCompany_Id(id);
    }

    public Page<PreventiveMaintenance> findByCompanyForExport(Long companyId, Pageable pageable) {
        return preventiveMaintenanceRepository.findByCompanyForExport(companyId, pageable);
    }

    public Page<PreventiveMaintenance> findByCompanyForExport(User user, Pageable pageable) {
        if (user.isAllSitesAccess()) {
            return findByCompanyForExport(user.getCompany().getId(), pageable);
        }
        List<Long> siteIds = user.getSites().stream()
                .map(Site::getId)
                .toList();
        if (siteIds.isEmpty()) siteIds = List.of(-1L);
        return preventiveMaintenanceRepository.findByCompanyForExportAndAccessibleSites(
                user.getCompany().getId(), siteIds, pageable);
    }

    private void checkUsageBasedLimit(Company company) {
        Integer threshold = usageBasedFreeLimits.get(LicenseEntitlement.UNLIMITED_PM_SCHEDULES);
        if (!licenseService.hasEntitlement(LicenseEntitlement.UNLIMITED_PM_SCHEDULES)
                && preventiveMaintenanceRepository.hasMoreThan(company.getId(), threshold.longValue() - 1
        ))
            throw new CustomException("You need a license to add a new PM schedule. Free Limit reached: " + threshold,
                    HttpStatus.FORBIDDEN);

    }

    public Page<PreventiveMaintenance> findBySearchCriteriaWithEntityGraph(SearchCriteria searchCriteria) {
        SpecificationBuilder<PreventiveMaintenance> builder = new SpecificationBuilder<>();
        searchCriteria.getFilterFields().forEach(builder::with);
        Pageable page = PageRequest.of(searchCriteria.getPageNum(), searchCriteria.getPageSize(),
                searchCriteria.getDirection(), searchCriteria.getSortField());
        Specification<PreventiveMaintenance> baseSpec = builder.build();
        Specification<PreventiveMaintenance> fetchSpec = (root, query, criteriaBuilder) -> {
            if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                root.fetch(PreventiveMaintenance_.asset, JoinType.LEFT);
                root.fetch(PreventiveMaintenance_.location, JoinType.LEFT);
                root.fetch(PreventiveMaintenance_.category, JoinType.LEFT);
                root.fetch(PreventiveMaintenance_.primaryUser, JoinType.LEFT);
                root.fetch(PreventiveMaintenance_.team, JoinType.LEFT);
                root.fetch(PreventiveMaintenance_.image, JoinType.LEFT);
                root.fetch(PreventiveMaintenance_.schedule, JoinType.LEFT);
            }
            return baseSpec == null ? null : baseSpec.toPredicate(root, query, criteriaBuilder);
        };
        return preventiveMaintenanceRepository.findAll(fetchSpec, page);
    }

    public SearchCriteria getSearchCriteria(User user, SearchCriteria searchCriteria) {
        if (user.getRole().getRoleType().equals(RoleType.ROLE_CLIENT)) {
            if (user.getRole().getViewPermissions().contains(PermissionEntity.PREVENTIVE_MAINTENANCES)) {
                if (!user.getSuperAccountRelations().isEmpty()) {
                    List<Long> childCompanyIds = user.getSuperAccountRelations().stream()
                            .map(rel -> rel.getChildUser().getCompany().getId())
                            .distinct()
                            .toList();
                    searchCriteria.getFilterFields().add(FilterField.builder()
                            .field("company")
                            .operation("inm")
                            .joinType(JoinType.LEFT)
                            .value("")
                            .values(new ArrayList<>(childCompanyIds))
                            .build());
                } else {
                    searchCriteria.filterCompany(user);
                }
            } else throw new CustomException("Access Denied", HttpStatus.FORBIDDEN);
        }
        searchCriteria.filterAccessibleSites(user);
        return searchCriteria;
    }

    public List<CalendarEvent<PreventiveMaintenance>> getEvents(Date end, Long companyId) {
        if (!licenseService.hasEntitlement(LicenseEntitlement.PM_CALENDAR))
            return Collections.emptyList();
        SearchCriteria searchCriteria = new SearchCriteria();
        searchCriteria.getFilterFields().add(FilterField.builder()
                .field("company")
                .value(companyId)
                .operation("eq")
                .values(new ArrayList<>()).build());
        searchCriteria.getFilterFields().add(FilterField.builder()
                .field("createdAt")
                .operation("le")
                .value(end)
                .values(new ArrayList<>()).build());
        return getEventsByCriteria(searchCriteria);
    }

    public List<CalendarEvent<PreventiveMaintenance>> getEventsByCriteria(SearchCriteria searchCriteria) {
        if (!licenseService.hasEntitlement(LicenseEntitlement.PM_CALENDAR))
            return Collections.emptyList();
        SpecificationBuilder<PreventiveMaintenance> builder = new SpecificationBuilder<>();
        searchCriteria.getFilterFields().forEach(builder::with);
        List<PreventiveMaintenance> preventiveMaintenances =
                preventiveMaintenanceRepository.findAll(builder.build());
        List<CalendarEvent<PreventiveMaintenance>> result = new ArrayList<>();

        for (PreventiveMaintenance preventiveMaintenance : preventiveMaintenances) {
            Schedule schedule = preventiveMaintenance.getSchedule();
            if (schedule == null || schedule.isDisabled()) continue;

            if (schedule.getRecurrenceBasedOn() != RecurrenceBasedOn.SCHEDULED_DATE) continue;

            try {
                TriggerKey triggerKey = new TriggerKey("wo-trigger-" + schedule.getId(), "wo-group");
                Trigger trigger = scheduler.getTrigger(triggerKey);

                if (trigger == null) {
                    log.warn("No trigger found for schedule {}", schedule.getId());
                    continue;
                }

                // Get all fire times up to the end date
                List<Date> fireTimes = new ArrayList<>();

                // Use TriggerUtils to get computed fire times
                if (trigger instanceof OperableTrigger) {
                    OperableTrigger operableTrigger = (OperableTrigger) trigger;
                    Date currentTime = new Date();

                    // Start from now or startsOn, whichever is earlier
                    Date startTime = schedule.getStartsOn().before(currentTime) ?
                            schedule.getStartsOn() : currentTime;

                    // Compute fire times
                    Date fireTime = operableTrigger.getFireTimeAfter(startTime);
                    while (fireTime != null) {
                        if (shouldFireOnDate(schedule, fireTime)) {
                            fireTimes.add(fireTime);
                        }
                        fireTime = operableTrigger.getFireTimeAfter(fireTime);

                        // Safety limit to prevent infinite loops
                        if (fireTimes.size() > 1000) {
                            log.warn("Reached safety limit of 1000 events for schedule {}", schedule.getId());
                            break;
                        }
                    }
                }

                // Convert fire times to calendar events
                result.addAll(fireTimes.stream()
                        .map(fireTime -> {
                            long durationMillis = preventiveMaintenance.getEstimatedDuration() > 0
                                    ? (long) (preventiveMaintenance.getEstimatedDuration() * 3600_000)
                                    : 3600_000L;
                            Date eventDate;
                            Date endDate = fireTime;
                            if (schedule.getDueDateDelay() != null) {
                                endDate =
                                        new Date(fireTime.getTime() + TimeUnit.DAYS.toMillis(schedule.getDueDateDelay()));
                            }
                            eventDate = new Date(endDate.getTime() - durationMillis);

                            return new CalendarEvent<>("PREVENTIVE_MAINTENANCE", preventiveMaintenance, eventDate,
                                    endDate);
                        })
                        .toList());

            } catch (SchedulerException e) {
                log.error("Error getting trigger fire times for schedule {}", schedule.getId(), e);
            }
        }

        return result;
    }

    private boolean shouldFireOnDate(Schedule schedule, Date fireTime) {
        if (schedule.getRecurrenceType() != RecurrenceType.WEEKLY || schedule.getFrequency() <= 1) {
            return true;
        }

        String tzId = schedule.getPreventiveMaintenance()
                .getCompany().getCompanySettings()
                .getGeneralPreferences().getTimeZone();
        ZoneId zoneId = ZoneId.of(tzId);

        long daysSinceStart = ChronoUnit.DAYS.between(
                schedule.getStartsOn().toInstant().atZone(zoneId).toLocalDate(),
                fireTime.toInstant().atZone(zoneId).toLocalDate()
        );
        long weeksSinceStart = daysSinceStart / 7;

        return weeksSinceStart % schedule.getFrequency() == 0;
    }

    public Optional<PreventiveMaintenance> findByIdAndCompany(Long id, Long companyId) {
        return preventiveMaintenanceRepository.findByIdAndCompany_Id(id, companyId);
    }

    public List<PreventiveMaintenance> saveAll(List<PreventiveMaintenance> preventiveMaintenances) {
        return preventiveMaintenanceRepository.saveAll(preventiveMaintenances);
    }

    public List<PreventiveMaintenance> findByIdsAndCompany(List<Long> ids, Long companyId) {
        return preventiveMaintenanceRepository.findByIdInAndCompany_Id(ids, companyId);
    }

    public void importPreventiveMaintenance(PreventiveMaintenance preventiveMaintenance,
                                            PreventiveMaintenanceImportDTO pmImportDTO, Company company) {
        checkUsageBasedLimit(company);
        Helper.populateWorkOrderBaseFromImportDTO(preventiveMaintenance, pmImportDTO, company, locationService,
                teamService, userService, assetService, workOrderCategoryService);

        preventiveMaintenance.setName(pmImportDTO.getName());
        preventiveMaintenance.setCompany(company);
        Schedule schedule = preventiveMaintenance.getSchedule();
        schedule.setStartsOn(Helper.getDateFromExcelDate(pmImportDTO.getStartsOn()));
        schedule.setFrequency((int) pmImportDTO.getFrequency());
        schedule.setDueDateDelay(pmImportDTO.getDueDateDelay() == null ? null :
                pmImportDTO.getDueDateDelay().intValue());
        schedule.setEndsOn(Helper.getDateFromExcelDate(pmImportDTO.getEndsOn()));
        schedule.setRecurrenceType(RecurrenceType.valueOf(pmImportDTO.getRecurrenceType().toUpperCase()));
        schedule.setRecurrenceBasedOn(RecurrenceBasedOn.valueOf(pmImportDTO.getRecurrenceBasedOn().trim().replaceAll(
                "\\s+", "_").toUpperCase()));
        schedule.setDaysOfWeek(pmImportDTO.getDaysOfWeek().stream().map(this::getDayOfWeekNumber).collect(Collectors.toList()));

        preventiveMaintenance.setCustomId("PM" + String.format("%06d",
                customSequenceService.getNextPreventiveMaintenanceSequence(company)));
        Sanitizer.sanitizePreventiveMaintenance(preventiveMaintenance);

        PreventiveMaintenance savedPM = preventiveMaintenanceRepository.save(preventiveMaintenance);
        scheduleService.reScheduleWorkOrder(savedPM.getSchedule());
    }

    private int getDayOfWeekNumber(String day) {
        return switch (day.toLowerCase()) {
            case "monday" -> 0;
            case "tuesday" -> 1;
            case "wednesday" -> 2;
            case "thursday" -> 3;
            case "friday" -> 4;
            case "saturday" -> 5;
            case "sunday" -> 6;
            default -> throw new IllegalArgumentException("Invalid day of week: " + day);
        };
    }

    private Site resolveSite(Site reference, Company company) {
        return siteRepository.findById(reference.getId())
                .filter(site -> site.getCompany().getId().equals(company.getId()))
                .orElseThrow(() -> new CustomException("Site not found", HttpStatus.BAD_REQUEST));
    }
}
