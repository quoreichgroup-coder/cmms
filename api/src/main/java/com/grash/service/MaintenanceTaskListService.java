package com.grash.service;

import com.grash.dto.MaintenanceTaskListDTO;
import com.grash.dto.MaintenanceTaskListDefaultsDTO;
import com.grash.dto.MaintenanceTaskListWorkCenterSuggestionDTO;
import com.grash.dto.MaintenanceTaskListGroupOptionDTO;
import com.grash.dto.MaintenanceTaskListOptionDTO;
import com.grash.dto.MaintenanceTaskListReferenceObjectDTO;
import com.grash.model.Asset;
import com.grash.model.Location;
import com.grash.exception.CustomException;
import com.grash.model.MaintenanceTaskList;
import com.grash.model.MaintenanceTaskListConfiguration;
import com.grash.model.MaintenanceTaskListCounter;
import com.grash.model.MaintenanceTaskListGroupSequence;
import com.grash.model.Part;
import com.grash.model.TaskListOperation;
import com.grash.model.TaskListOperationMaterial;
import com.grash.model.User;
import com.grash.model.enums.PlanFeatures;
import com.grash.model.enums.PermissionEntity;
import com.grash.repository.AssetRepository;
import com.grash.repository.LocationRepository;
import com.grash.repository.MaintenanceTaskListRepository;
import com.grash.repository.MaintenanceTaskListCounterRepository;
import com.grash.repository.MaintenanceTaskListConfigurationRepository;
import com.grash.repository.MaintenanceTaskListGroupSequenceRepository;
import com.grash.repository.PartRepository;
import com.grash.repository.TaskListOperationRepository;
import com.grash.repository.WorkOrderRepository;
import com.grash.repository.ScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MaintenanceTaskListService {
    private final MaintenanceTaskListRepository taskListRepository;
    private final MaintenanceTaskListCounterRepository counterRepository;
    private final MaintenanceTaskListConfigurationRepository configurationRepository;
    private final MaintenanceTaskListGroupSequenceRepository groupSequenceRepository;
    private final TaskListOperationRepository operationRepository;
    private final PartRepository partRepository;
    private final WorkOrderRepository workOrderRepository;
    private final ScheduleRepository scheduleRepository;
    private final AssetRepository assetRepository;
    private final LocationRepository locationRepository;

    @Transactional(readOnly = true)
    public Page<MaintenanceTaskListDTO> search(User user, String query, int page, int size) {
        assertModuleEnabled(user);
        if (!user.getRole().getViewPermissions().contains(com.grash.model.enums.PermissionEntity.TASK_LISTS)) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 100);
        Long ownerId = user.getRole().getViewOtherPermissions()
                .contains(com.grash.model.enums.PermissionEntity.TASK_LISTS) ? null : user.getId();
        return taskListRepository.search(user.getCompany().getId(), query == null ? "" : query.trim(), ownerId,
                        PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "updatedAt")))
                .map(taskList -> toDto(taskList, user));
    }

    @Transactional(readOnly = true)
    public Page<MaintenanceTaskListOptionDTO> searchActiveOptions(User user, String query, int page, int size) {
        assertModuleEnabled(user);
        if (!user.getRole().getViewPermissions().contains(PermissionEntity.TASK_LISTS)) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
        Long ownerId = user.getRole().getViewOtherPermissions()
                .contains(PermissionEntity.TASK_LISTS) ? null : user.getId();
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 100);
        return taskListRepository.searchActiveOptions(user.getCompany().getId(),
                query == null ? "" : query.trim(), ownerId,
                PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "updatedAt")));
    }

    @Transactional(readOnly = true)
    public List<MaintenanceTaskListGroupOptionDTO> groups(User user) {
        assertModuleEnabled(user);
        if (!user.getRole().getViewPermissions().contains(com.grash.model.enums.PermissionEntity.TASK_LISTS)) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
        Long ownerId = user.getRole().getViewOtherPermissions()
                .contains(com.grash.model.enums.PermissionEntity.TASK_LISTS) ? null : user.getId();
        List<MaintenanceTaskListGroupOptionDTO> options = taskListRepository.findGroups(user.getCompany().getId(), ownerId);
        Map<String, Long> optionsPerCode = options.stream().collect(java.util.stream.Collectors.groupingBy(
                option -> option.groupCode().toLowerCase(Locale.ROOT), java.util.stream.Collectors.counting()));
        // A group must have one stable SAP identity (type and reference object). Hide
        // ambiguous legacy groups so the user cannot select an option that the API
        // would later reject or allocate counters across unrelated objects.
        return options.stream().filter(option -> optionsPerCode.get(option.groupCode().toLowerCase(Locale.ROOT)) == 1)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MaintenanceTaskListDTO> groupCounters(String groupCode, User user) {
        assertModuleEnabled(user);
        if (!user.getRole().getViewPermissions().contains(PermissionEntity.TASK_LISTS)) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
        if (groupCode == null || groupCode.isBlank()) return List.of();
        Long ownerId = user.getRole().getViewOtherPermissions().contains(PermissionEntity.TASK_LISTS)
                ? null : user.getId();
        List<MaintenanceTaskList> counters = taskListRepository.findGroupCounters(
                user.getCompany().getId(), groupCode.trim(), ownerId);
        boolean containsHiddenComponents = counters.stream()
                .flatMap(taskList -> taskList.getOperations().stream())
                .flatMap(operation -> operation.getMaterials().stream())
                .anyMatch(material -> !material.getPart().canBeViewedBy(user));
        if (containsHiddenComponents) {
            throw new CustomException("task_list_copy_parts_not_accessible", HttpStatus.FORBIDDEN);
        }
        return counters.stream().map(taskList -> toDto(taskList, user)).toList();
    }

    @Transactional(readOnly = true)
    public MaintenanceTaskListDefaultsDTO defaults(User user) {
        assertModuleEnabled(user);
        if (!user.getRole().getViewPermissions().contains(PermissionEntity.TASK_LISTS)) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
        Long companyId = user.getCompany().getId();
        Long ownerId = user.getRole().getViewOtherPermissions().contains(PermissionEntity.TASK_LISTS)
                ? null : user.getId();
        List<MaintenanceTaskListWorkCenterSuggestionDTO> rawCenterDefaults = taskListRepository
                .findWorkCenterDefaultCandidates(companyId, ownerId);
        java.util.TreeMap<String, String> workCenters = new java.util.TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        taskListRepository.findConfiguredHeaderWorkCenters(companyId, ownerId).forEach(value -> addOption(workCenters, value));
        rawCenterDefaults.forEach(candidate -> addOption(workCenters, candidate.workCenter()));
        java.util.TreeMap<String, String> controlKeys = options(rawCenterDefaults.stream()
                .map(MaintenanceTaskListWorkCenterSuggestionDTO::controlKey).toList());
        java.util.TreeMap<String, String> workUnits = options(rawCenterDefaults.stream()
                .map(MaintenanceTaskListWorkCenterSuggestionDTO::workUnit).toList());
        java.util.TreeMap<String, String> durationUnits = options(rawCenterDefaults.stream()
                .map(MaintenanceTaskListWorkCenterSuggestionDTO::durationUnit).toList());
        java.util.TreeMap<String, String> conditions = options(rawCenterDefaults.stream()
                .map(MaintenanceTaskListWorkCenterSuggestionDTO::systemCondition).toList());
        Map<String, List<MaintenanceTaskListWorkCenterSuggestionDTO>> candidates = rawCenterDefaults.stream()
                .collect(Collectors.groupingBy(MaintenanceTaskListWorkCenterSuggestionDTO::workCenter,
                        () -> new java.util.TreeMap<>(String.CASE_INSENSITIVE_ORDER), Collectors.toList()));
        List<MaintenanceTaskListWorkCenterSuggestionDTO> centerDefaults = candidates.entrySet().stream()
                .map(entry -> mergeCenterDefaults(entry.getKey(), entry.getValue()))
                .toList();
        MaintenanceTaskListConfiguration configuration = configurationRepository.findByCompany_Id(companyId)
                .orElseGet(MaintenanceTaskListConfiguration::new);
        splitCatalog(configuration.getWorkCenterCatalog()).forEach(value -> addOption(workCenters, value));
        splitCatalog(configuration.getControlKeyCatalog()).forEach(value -> addOption(controlKeys, value));
        return new MaintenanceTaskListDefaultsDTO(List.copyOf(workCenters.values()), List.copyOf(controlKeys.values()),
                List.copyOf(workUnits.values()), List.copyOf(durationUnits.values()), List.copyOf(conditions.values()),
                centerDefaults, configuration.getOperationNumberStart(), configuration.getOperationNumberIncrement(),
                configuration.getDefaultWorkers(), configuration.getDefaultWorkUnit(), configuration.getDefaultDurationUnit());
    }

    private List<String> splitCatalog(String catalog) {
        if (catalog == null || catalog.isBlank()) return List.of();
        return java.util.Arrays.stream(catalog.split("\\R")).map(String::trim).filter(value -> !value.isEmpty()).toList();
    }

    private MaintenanceTaskListWorkCenterSuggestionDTO mergeCenterDefaults(
            String workCenter, List<MaintenanceTaskListWorkCenterSuggestionDTO> candidates) {
        return new MaintenanceTaskListWorkCenterSuggestionDTO(workCenter,
                uniqueText(candidates, MaintenanceTaskListWorkCenterSuggestionDTO::controlKey),
                uniqueDecimal(candidates),
                uniqueText(candidates, MaintenanceTaskListWorkCenterSuggestionDTO::workUnit),
                uniqueText(candidates, MaintenanceTaskListWorkCenterSuggestionDTO::durationUnit),
                uniqueText(candidates, MaintenanceTaskListWorkCenterSuggestionDTO::systemCondition));
    }

    private String uniqueText(List<MaintenanceTaskListWorkCenterSuggestionDTO> candidates,
                              Function<MaintenanceTaskListWorkCenterSuggestionDTO, String> getter) {
        java.util.TreeMap<String, String> values = new java.util.TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        candidates.stream().map(getter).filter(value -> value != null && !value.isBlank())
                .map(String::trim).forEach(value -> values.putIfAbsent(value, value));
        return values.size() == 1 ? values.firstEntry().getValue() : null;
    }

    private BigDecimal uniqueDecimal(List<MaintenanceTaskListWorkCenterSuggestionDTO> candidates) {
        java.util.TreeSet<BigDecimal> values = new java.util.TreeSet<>(BigDecimal::compareTo);
        candidates.stream().map(MaintenanceTaskListWorkCenterSuggestionDTO::workers).filter(Objects::nonNull)
                .filter(value -> value.signum() > 0).forEach(values::add);
        return values.size() == 1 ? values.first() : null;
    }

    private java.util.TreeMap<String, String> options(List<String> candidates) {
        java.util.TreeMap<String, String> values = new java.util.TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        candidates.forEach(value -> addOption(values, value));
        return values;
    }

    private void addOption(Map<String, String> values, String candidate) {
        if (candidate != null && !candidate.isBlank()) {
            String normalized = candidate.trim();
            values.putIfAbsent(normalized, normalized);
        }
    }

    @Transactional(readOnly = true)
    public List<MaintenanceTaskListReferenceObjectDTO> referenceObjects(String taskListType, User user) {
        assertModuleEnabled(user);
        if (!user.getRole().getViewPermissions().contains(PermissionEntity.TASK_LISTS)) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
        String type = taskListType == null ? "" : taskListType.trim().toUpperCase(Locale.ROOT);
        if ("EQUIPMENT".equals(type)) {
            if (!user.getRole().getViewPermissions().contains(PermissionEntity.ASSETS)) {
                throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
            }
            return assetRepository.findByCompany_Id(user.getCompany().getId()).stream()
                    .filter(asset -> asset.canBeViewedBy(user) && user.canAccessSite(asset.getSite()))
                    .map(asset -> new MaintenanceTaskListReferenceObjectDTO(asset.getId(),
                            (asset.getCustomId() == null ? "" : asset.getCustomId() + " · ") + asset.getName()))
                    .sorted(java.util.Comparator.comparing(MaintenanceTaskListReferenceObjectDTO::displayName,
                            String.CASE_INSENSITIVE_ORDER)).toList();
        }
        if ("FUNCTIONAL_LOCATION".equals(type)) {
            if (!user.getRole().getViewPermissions().contains(PermissionEntity.LOCATIONS)) {
                throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
            }
            return locationRepository.findByCompany_Id(user.getCompany().getId()).stream()
                    .filter(location -> location.canBeViewedBy(user))
                    .map(location -> new MaintenanceTaskListReferenceObjectDTO(location.getId(),
                            (location.getCustomId() == null ? "" : location.getCustomId() + " · ") + location.getName()))
                    .sorted(java.util.Comparator.comparing(MaintenanceTaskListReferenceObjectDTO::displayName,
                            String.CASE_INSENSITIVE_ORDER)).toList();
        }
        if ("GENERAL".equals(type)) return List.of();
        throw new CustomException("invalid_task_list_type", HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @Transactional(readOnly = true)
    public MaintenanceTaskListDTO get(Long id, User user) {
        return toDto(find(id, user), user);
    }

    @Transactional
    public MaintenanceTaskListDTO create(MaintenanceTaskListDTO dto, User user) {
        assertModuleEnabled(user);
        if (!user.getRole().getCreatePermissions().contains(com.grash.model.enums.PermissionEntity.TASK_LISTS)) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
        validateHeader(dto);
        validateDates(dto.validFrom(), dto.validTo());
        if (!canManageParts(user) && dto.operations().stream().anyMatch(operation ->
                operation.materials() != null && !operation.materials().isEmpty())) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
        MaintenanceTaskList entity = new MaintenanceTaskList();
        entity.setCompany(user.getCompany());
        taskListRepository.lockCompanyForCounterGeneration(user.getCompany().getId());
        String groupCode = dto.existingGroupCode() == null || dto.existingGroupCode().isBlank()
                ? allocateGroupCode(user) : validateExistingGroup(dto, user);
        entity.setGroupCode(groupCode);
        applyHeader(entity, dto, user, true);
        entity.setGroupCounter(allocateGroupCounter(user, groupCode));
        applyOperations(entity, dto.operations(), user, canManageParts(user));
        validateForSave(entity);
        return toDto(taskListRepository.save(entity), user);
    }

    @Transactional
    public MaintenanceTaskListDTO update(Long id, MaintenanceTaskListDTO dto, User user) {
        MaintenanceTaskList entity = find(id, user);
        assertCanEdit(entity, user);
        validateHeader(dto);
        validateDates(dto.validFrom(), dto.validTo());
        if (!entity.getTaskListType().equalsIgnoreCase(dto.taskListType().trim())) {
            throw new CustomException("task_list_identity_immutable", HttpStatus.CONFLICT);
        }
        if ((dto.assetId() != null && !Objects.equals(dto.assetId(), entity.getAsset() == null ? null : entity.getAsset().getId()))
                || (dto.locationId() != null && !Objects.equals(dto.locationId(), entity.getLocation() == null ? null : entity.getLocation().getId()))) {
            throw new CustomException("task_list_identity_immutable", HttpStatus.CONFLICT);
        }
        applyHeader(entity, dto);
        applyOperations(entity, dto.operations(), user, canManageParts(user));
        validateForSave(entity);
        return toDto(taskListRepository.save(entity), user);
    }

    private String allocateGroupCode(User user) {
        Long companyId = user.getCompany().getId();
        MaintenanceTaskListGroupSequence sequence = groupSequenceRepository.findByCompany_Id(companyId).orElse(null);
        if (sequence == null) {
            java.math.BigInteger highest = taskListRepository.findGroupCodes(companyId).stream()
                    .filter(code -> code != null && code.matches("(?i)TL\\d+"))
                    .map(code -> new java.math.BigInteger(code.substring(2)))
                    .max(java.math.BigInteger::compareTo)
                    .orElse(java.math.BigInteger.ZERO);
            java.math.BigInteger next = highest.add(java.math.BigInteger.ONE);
            if (next.compareTo(java.math.BigInteger.valueOf(Integer.MAX_VALUE)) >= 0) {
                throw new CustomException("task_list_group_code_limit_reached", HttpStatus.CONFLICT);
            }
            sequence = new MaintenanceTaskListGroupSequence();
            sequence.setCompany(user.getCompany());
            sequence.setNextGroupNumber(next.intValue());
        }
        int allocated = sequence.getNextGroupNumber();
        if (allocated < 1 || allocated == Integer.MAX_VALUE) {
            throw new CustomException("task_list_group_code_limit_reached", HttpStatus.CONFLICT);
        }
        sequence.setNextGroupNumber(allocated + 1);
        groupSequenceRepository.save(sequence);
        return String.format(Locale.ROOT, "TL%06d", allocated);
    }

    private String validateExistingGroup(MaintenanceTaskListDTO dto, User user) {
        String requestedCode = dto.existingGroupCode().trim();
        List<MaintenanceTaskList> group = taskListRepository.findByCompany_IdAndGroupCodeIgnoreCase(
                user.getCompany().getId(), requestedCode);
        if (group.isEmpty()) throw new CustomException("task_list_group_not_found", HttpStatus.NOT_FOUND);
        boolean canViewOther = user.getRole().getViewOtherPermissions()
                .contains(com.grash.model.enums.PermissionEntity.TASK_LISTS);
        if (!canViewOther && group.stream().noneMatch(item -> user.getId().equals(item.getCreatedBy()))) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
        String expectedType = dto.taskListType().trim();
        if (group.stream().anyMatch(item -> !expectedType.equalsIgnoreCase(item.getTaskListType()))) {
            throw new CustomException("task_list_group_type_mismatch", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        Long assetId = dto.assetId();
        Long locationId = dto.locationId();
        if (group.stream().anyMatch(item -> !Objects.equals(assetId, item.getAsset() == null ? null : item.getAsset().getId())
                || !Objects.equals(locationId, item.getLocation() == null ? null : item.getLocation().getId()))) {
            throw new CustomException("task_list_group_object_mismatch", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        return group.get(0).getGroupCode();
    }

    private String allocateGroupCounter(User user, String groupCode) {
        Long companyId = user.getCompany().getId();
        taskListRepository.lockCompanyForCounterGeneration(companyId);
        MaintenanceTaskListCounter counter = counterRepository
                .findByCompany_IdAndGroupCodeIgnoreCase(companyId, groupCode)
                .orElse(null);
        if (counter == null) {
            counter = new MaintenanceTaskListCounter();
            counter.setCompany(user.getCompany());
            counter.setGroupCode(groupCode);
            java.math.BigInteger highest = taskListRepository.findCountersForGroup(companyId, groupCode).stream()
                    .filter(value -> value != null && value.matches("\\d+"))
                    .map(java.math.BigInteger::new)
                    .max(java.math.BigInteger::compareTo)
                    .orElse(java.math.BigInteger.ZERO);
            java.math.BigInteger next = highest.add(java.math.BigInteger.ONE);
            if (next.compareTo(java.math.BigInteger.valueOf(Integer.MAX_VALUE)) >= 0) {
                throw new CustomException("task_list_group_counter_limit_reached", HttpStatus.CONFLICT);
            }
            counter.setNextCounter(next.intValue());
        }
        int allocated = counter.getNextCounter();
        if (allocated < 1 || allocated == Integer.MAX_VALUE) {
            throw new CustomException("task_list_group_counter_limit_reached", HttpStatus.CONFLICT);
        }
        counter.setNextCounter(allocated + 1);
        counterRepository.save(counter);
        return String.format(Locale.ROOT, "%02d", allocated);
    }

    @Transactional
    public void delete(Long id, User user) {
        MaintenanceTaskList entity = find(id, user);
        assertCanDelete(entity, user);
        taskListRepository.lockCompanyForCounterGeneration(user.getCompany().getId());
        if (workOrderRepository.countByMaintenanceTaskListIdAndCompany_Id(
                entity.getId(), user.getCompany().getId()) > 0) {
            throw new CustomException("task_list_in_use_by_work_order", HttpStatus.CONFLICT);
        }
        if (scheduleRepository.countUsingMaintenanceTaskList(user.getCompany().getId(), entity.getId()) > 0) {
            throw new CustomException("task_list_in_use_by_preventive_maintenance", HttpStatus.CONFLICT);
        }
        taskListRepository.delete(entity);
    }

    private MaintenanceTaskList find(Long id, User user) {
        assertModuleEnabled(user);
        MaintenanceTaskList entity = taskListRepository.findByIdAndCompany_Id(id, user.getCompany().getId())
                .orElseThrow(() -> new CustomException("Not found", HttpStatus.NOT_FOUND));
        if (!user.getRole().getViewPermissions().contains(com.grash.model.enums.PermissionEntity.TASK_LISTS)
                || (!user.getRole().getViewOtherPermissions().contains(com.grash.model.enums.PermissionEntity.TASK_LISTS)
                && !user.getId().equals(entity.getCreatedBy()))) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
        return entity;
    }

    private void assertModuleEnabled(User user) {
        if (user.getCompany().getSubscription() == null
                || user.getCompany().getSubscription().getSubscriptionPlan() == null
                || !user.getCompany().getSubscription().getSubscriptionPlan().getFeatures()
                .contains(PlanFeatures.PREVENTIVE_MAINTENANCE)) {
            throw new CustomException("Preventive maintenance feature is not enabled", HttpStatus.FORBIDDEN);
        }
    }

    private void assertCanEdit(MaintenanceTaskList entity, User user) {
        if (!user.getRole().getEditOtherPermissions().contains(com.grash.model.enums.PermissionEntity.TASK_LISTS)
                && !user.getId().equals(entity.getCreatedBy())) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
    }

    private void assertCanDelete(MaintenanceTaskList entity, User user) {
        if (!user.getRole().getDeleteOtherPermissions().contains(com.grash.model.enums.PermissionEntity.TASK_LISTS)
                && !user.getId().equals(entity.getCreatedBy())) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
    }

    private void applyHeader(MaintenanceTaskList entity, MaintenanceTaskListDTO dto) {
        entity.setDescription(dto.description().trim());
        entity.setWorkCenter(blankToNull(dto.workCenter()));
        entity.setValidFrom(dto.validFrom());
        entity.setValidTo(dto.validTo());
        String status = dto.status().trim().toUpperCase();
        if (!Set.of("DRAFT", "ACTIVE", "INACTIVE").contains(status)) {
            throw new CustomException("invalid_task_list_status", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        entity.setStatus(status);
    }

    private void applyHeader(MaintenanceTaskList entity, MaintenanceTaskListDTO dto, User user, boolean creating) {
        String type = dto.taskListType().trim().toUpperCase(Locale.ROOT);
        if (!Set.of("GENERAL", "EQUIPMENT", "FUNCTIONAL_LOCATION").contains(type)) {
            throw new CustomException("invalid_task_list_type", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        entity.setTaskListType(type);
        if (creating) {
            switch (type) {
                case "GENERAL" -> {
                    if (dto.assetId() != null || dto.locationId() != null) {
                        throw new CustomException("task_list_reference_object_not_allowed", HttpStatus.UNPROCESSABLE_ENTITY);
                    }
                }
                case "EQUIPMENT" -> {
                    if (dto.assetId() == null || dto.locationId() != null
                            || !user.getRole().getViewPermissions().contains(PermissionEntity.ASSETS)) {
                        throw new CustomException("task_list_equipment_required", HttpStatus.UNPROCESSABLE_ENTITY);
                    }
                    Asset asset = assetRepository.findByIdAndCompany_Id(dto.assetId(), user.getCompany().getId())
                            .filter(candidate -> candidate.canBeViewedBy(user) && user.canAccessSite(candidate.getSite()))
                            .orElseThrow(() -> new CustomException("task_list_reference_object_unavailable", HttpStatus.UNPROCESSABLE_ENTITY));
                    entity.setAsset(asset);
                    entity.setLocation(null);
                }
                case "FUNCTIONAL_LOCATION" -> {
                    if (dto.locationId() == null || dto.assetId() != null
                            || !user.getRole().getViewPermissions().contains(PermissionEntity.LOCATIONS)) {
                        throw new CustomException("task_list_functional_location_required", HttpStatus.UNPROCESSABLE_ENTITY);
                    }
                    Location location = locationRepository.findByIdAndCompany_Id(dto.locationId(), user.getCompany().getId())
                            .filter(candidate -> candidate.canBeViewedBy(user))
                            .orElseThrow(() -> new CustomException("task_list_reference_object_unavailable", HttpStatus.UNPROCESSABLE_ENTITY));
                    entity.setLocation(location);
                    entity.setAsset(null);
                }
            }
        }
        applyHeader(entity, dto);
    }

    private void applyOperations(MaintenanceTaskList list, List<MaintenanceTaskListDTO.OperationDTO> dtos,
                                 User user, boolean canManageParts) {
        if (dtos == null) return;
        Set<String> numbers = new HashSet<>();
        Map<Long, TaskListOperation> byId = new HashMap<>();
        Map<String, TaskListOperation> byNumber = new HashMap<>();
        for (TaskListOperation existing : list.getOperations()) {
            if (existing.getId() != null) byId.put(existing.getId(), existing);
            byNumber.put(existing.getOperationNumber().toLowerCase(), existing);
        }
        // Free unique operation numbers before applying edits that may swap sequence numbers.
        if (!byId.isEmpty()) {
            byId.values().forEach(existing -> existing.setOperationNumber(
                    UUID.randomUUID().toString().replace("-", "").substring(0, 19)));
            operationRepository.saveAll(byId.values());
            operationRepository.flush();
        }
        List<TaskListOperation> updatedOperations = new ArrayList<>();
        Set<TaskListOperation> retainedOperations = Collections.newSetFromMap(new IdentityHashMap<>());
        int order = 0;
        for (MaintenanceTaskListDTO.OperationDTO dto : dtos) {
            validateOperation(dto);
            String operationNumber = dto.operationNumber().trim();
            if (!numbers.add(operationNumber.toLowerCase())) {
                throw new CustomException("duplicate_task_list_operation_number", HttpStatus.UNPROCESSABLE_ENTITY);
            }
            TaskListOperation operation = dto.id() == null ? null : byId.get(dto.id());
            if (dto.id() != null && operation == null) {
                throw new CustomException("task_list_operation_not_found", HttpStatus.UNPROCESSABLE_ENTITY);
            }
            if (operation == null) operation = byNumber.get(operationNumber.toLowerCase());
            if (operation == null) operation = new TaskListOperation();
            operation.setCompany(user.getCompany());
            operation.setTaskList(list);
            operation.setOperationNumber(operationNumber);
            operation.setShortDescription(dto.shortDescription().trim());
            operation.setLongText(blankToNull(dto.longText()));
            operation.setWorkCenter(blankToNull(dto.workCenter()));
            operation.setControlKey(blankToNull(dto.controlKey()));
            operation.setWorkers(dto.workers());
            BigDecimal derivedWork = calculateLaborWork(dto.duration(), dto.durationUnit(), dto.workers(), dto.workUnit());
            operation.setPlannedWork(derivedWork == null ? dto.plannedWork() : derivedWork);
            operation.setWorkUnit(blankToNull(dto.workUnit()));
            operation.setDuration(dto.duration());
            operation.setDurationUnit(blankToNull(dto.durationUnit()));
            operation.setSystemCondition(blankToNull(dto.systemCondition()));
            operation.setOperationOrder(order++);
            if (canManageParts) {
                Map<Long, TaskListOperationMaterial> existingMaterials = new HashMap<>();
                operation.getMaterials().forEach(material -> existingMaterials.put(material.getId(), material));
                Set<TaskListOperationMaterial> retainedMaterials = Collections.newSetFromMap(new IdentityHashMap<>());
                operation.getMaterials().stream().filter(material -> !material.getPart().canBeViewedBy(user))
                        .forEach(retainedMaterials::add);
                for (MaintenanceTaskListDTO.MaterialDTO materialDto : dto.materials() == null
                        ? List.<MaintenanceTaskListDTO.MaterialDTO>of() : dto.materials()) {
                    validateMaterial(materialDto);
                    Part part = partRepository.findByIdAndCompany_Id(materialDto.partId(), user.getCompany().getId())
                            .orElseThrow(() -> new CustomException("part_unavailable", HttpStatus.UNPROCESSABLE_ENTITY));
                    TaskListOperationMaterial material = materialDto.id() == null
                            ? null : existingMaterials.get(materialDto.id());
                    if (materialDto.id() != null && material == null) {
                        throw new CustomException("task_list_material_not_found", HttpStatus.UNPROCESSABLE_ENTITY);
                    }
                    if (!part.canBeViewedBy(user)) {
                        throw new CustomException("part_unavailable", HttpStatus.UNPROCESSABLE_ENTITY);
                    }
                    if (material == null) material = new TaskListOperationMaterial();
                    material.setCompany(user.getCompany());
                    material.setOperation(operation);
                    material.setPart(part);
                    material.setQuantity(materialDto.quantity());
                    material.setUnit(blankToNull(materialDto.unit()) == null ? part.getUnit() : materialDto.unit().trim());
                    material.setStorageLocation(blankToNull(materialDto.storageLocation()));
                    material.setEstimatedUnitCost(materialDto.estimatedUnitCost());
                    retainedMaterials.add(material);
                }
                TaskListOperation currentOperation = operation;
                operation.getMaterials().removeIf(material -> !retainedMaterials.contains(material));
                retainedMaterials.stream().filter(material -> currentOperation.getMaterials().stream()
                        .noneMatch(existing -> existing == material)).forEach(currentOperation.getMaterials()::add);
            }
            updatedOperations.add(operation);
            retainedOperations.add(operation);
        }
        list.getOperations().removeIf(operation -> !retainedOperations.contains(operation));
        updatedOperations.stream().filter(operation -> list.getOperations().stream()
                .noneMatch(existing -> existing == operation)).forEach(list.getOperations()::add);
    }

    private MaintenanceTaskListDTO toDto(MaintenanceTaskList list, User user) {
        List<MaintenanceTaskListDTO.OperationDTO> operations = list.getOperations().stream()
                .sorted(java.util.Comparator.comparingInt(TaskListOperation::getOperationOrder))
                .map(operation -> new MaintenanceTaskListDTO.OperationDTO(operation.getId(),
                        operation.getOperationNumber(), operation.getShortDescription(), operation.getLongText(),
                        operation.getWorkCenter(), operation.getControlKey(), operation.getWorkers(),
                        operation.getPlannedWork(), operation.getWorkUnit(), operation.getDuration(),
                        operation.getDurationUnit(), operation.getSystemCondition(), operation.getOperationOrder(),
                        operation.getMaterials().stream().filter(material -> canManageParts(user)
                                        && material.getPart().canBeViewedBy(user))
                                .map(material -> new MaintenanceTaskListDTO.MaterialDTO(
                                material.getId(), material.getPart().getId(), material.getQuantity(),
                                material.getUnit(), material.getStorageLocation(), material.getEstimatedUnitCost()))
                                .toList()))
                .toList();
        return new MaintenanceTaskListDTO(list.getId(), list.getGroupCode(), list.getGroupCounter(), null,
                list.getDescription(), list.getTaskListType(), list.getAsset() == null ? null : list.getAsset().getId(),
                list.getLocation() == null ? null : list.getLocation().getId(), list.getWorkCenter(), list.getValidFrom(),
                list.getValidTo(), list.getStatus(), operations, list.getCreatedBy());
    }

    private void validateDates(LocalDate from, LocalDate to) {
        if (from != null && to != null && to.isBefore(from)) {
            throw new CustomException("task_list_valid_to_before_valid_from", HttpStatus.UNPROCESSABLE_ENTITY);
        }
    }

    private void validateForSave(MaintenanceTaskList taskList) {
        if ("ACTIVE".equals(taskList.getStatus()) && taskList.getOperations().isEmpty()) {
            throw new CustomException("active_task_list_requires_operation", HttpStatus.UNPROCESSABLE_ENTITY);
        }
    }

    private void validateOperation(MaintenanceTaskListDTO.OperationDTO operation) {
        if (operation == null || operation.operationNumber() == null || operation.operationNumber().isBlank()
                || operation.shortDescription() == null || operation.shortDescription().isBlank()) {
            throw new CustomException("task_list_operation_required_fields", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        if (operation.operationNumber().length() > 20 || operation.shortDescription().length() > 200
                || exceedsLength(operation.workCenter(), 120) || exceedsLength(operation.controlKey(), 40)
                || exceedsLength(operation.workUnit(), 20) || exceedsLength(operation.durationUnit(), 20)
                || exceedsLength(operation.systemCondition(), 80)) {
            throw new CustomException("task_list_operation_values_invalid", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        if ((operation.workers() != null && operation.workers().signum() <= 0)
                || (operation.plannedWork() != null && operation.plannedWork().signum() <= 0)
                || (operation.duration() != null && operation.duration().signum() <= 0)) {
            throw new CustomException("task_list_operation_values_must_be_positive", HttpStatus.UNPROCESSABLE_ENTITY);
        }
    }

    private void validateMaterial(MaintenanceTaskListDTO.MaterialDTO material) {
        if (material == null || material.partId() == null || material.partId() <= 0
                || material.quantity() == null || material.quantity().signum() <= 0
                || (material.estimatedUnitCost() != null && material.estimatedUnitCost().signum() < 0)
                || exceedsLength(material.unit(), 20) || exceedsLength(material.storageLocation(), 120)) {
            throw new CustomException("task_list_material_values_invalid", HttpStatus.UNPROCESSABLE_ENTITY);
        }
    }

    private void validateHeader(MaintenanceTaskListDTO dto) {
        if (dto == null || dto.description() == null || dto.description().isBlank()
                || dto.taskListType() == null || dto.taskListType().isBlank()
                || exceedsLength(dto.description(), 200) || exceedsLength(dto.taskListType(), 40)
                || exceedsLength(dto.workCenter(), 120)) {
            throw new CustomException("task_list_header_values_invalid", HttpStatus.UNPROCESSABLE_ENTITY);
        }
    }

    private boolean exceedsLength(String value, int maxLength) {
        return value != null && value.length() > maxLength;
    }

    static BigDecimal calculateLaborWork(BigDecimal duration, String durationUnit,
                                         BigDecimal workers, String workUnit) {
        BigDecimal durationSeconds = secondsPerUnit(durationUnit);
        BigDecimal workSeconds = secondsPerUnit(workUnit);
        if (durationSeconds == null || workSeconds == null || duration == null || workers == null
                || duration.signum() <= 0 || workers.signum() <= 0) {
            return null;
        }
        return duration.multiply(durationSeconds).multiply(workers)
                .divide(workSeconds, 3, RoundingMode.HALF_UP);
    }

    private static BigDecimal secondsPerUnit(String unit) {
        if (unit == null) return null;
        return switch (unit.trim().toUpperCase(Locale.ROOT)) {
            case "H", "HR", "HRS", "HOUR", "HOURS" -> BigDecimal.valueOf(3600);
            case "MIN", "MINS", "MINUTE", "MINUTES" -> BigDecimal.valueOf(60);
            case "S", "SEC", "SECS", "SECOND", "SECONDS" -> BigDecimal.ONE;
            default -> null;
        };
    }

    private boolean canManageParts(User user) {
        return user.getRole().getViewPermissions()
                .contains(com.grash.model.enums.PermissionEntity.PARTS_AND_MULTIPARTS);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
