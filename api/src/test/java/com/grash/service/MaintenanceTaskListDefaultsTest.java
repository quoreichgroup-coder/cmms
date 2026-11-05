package com.grash.service;

import com.grash.dto.MaintenanceTaskListDefaultsDTO;
import com.grash.dto.MaintenanceTaskListDTO;
import com.grash.dto.MaintenanceTaskListWorkCenterSuggestionDTO;
import com.grash.model.*;
import com.grash.model.enums.PermissionEntity;
import com.grash.model.enums.PlanFeatures;
import com.grash.exception.CustomException;
import com.grash.repository.*;
import org.springframework.http.HttpStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Set;
import java.math.BigDecimal;
import java.util.Optional;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.eq;

@ExtendWith(MockitoExtension.class)
class MaintenanceTaskListDefaultsTest {
    @InjectMocks private MaintenanceTaskListService service;
    @Mock private MaintenanceTaskListRepository taskListRepository;
    @Mock private MaintenanceTaskListCounterRepository counterRepository;
    @Mock private MaintenanceTaskListConfigurationRepository configurationRepository;
    @Mock private MaintenanceTaskListGroupSequenceRepository groupSequenceRepository;
    @Mock private TaskListOperationRepository operationRepository;
    @Mock private PartRepository partRepository;
    @Mock private WorkOrderRepository workOrderRepository;
    @Mock private ScheduleRepository scheduleRepository;
    @Mock private AssetRepository assetRepository;
    @Mock private LocationRepository locationRepository;

    @Test
    void defaultsMergeHeaderAndOperationWorkCentersAndSortWithoutCaseDuplicates() {
        User user = authorizedUser();
        when(configurationRepository.findByCompany_Id(42L)).thenReturn(Optional.empty());
        when(taskListRepository.findConfiguredHeaderWorkCenters(42L, 7L)).thenReturn(List.of("MECH", "  Electrical "));
        when(taskListRepository.findWorkCenterDefaultCandidates(42L, 7L)).thenReturn(List.of(
                new MaintenanceTaskListWorkCenterSuggestionDTO("MECH", "PM01", new BigDecimal("2"), "H", "H", "Shutdown"),
                new MaintenanceTaskListWorkCenterSuggestionDTO("mech", "PM02", new BigDecimal("3"), "H", "H", "Shutdown"),
                new MaintenanceTaskListWorkCenterSuggestionDTO("Workshop", " ZM01 ", null, "MIN", null, "Running")));

        MaintenanceTaskListDefaultsDTO result = service.defaults(user);

        assertEquals(List.of("Electrical", "MECH", "Workshop"), result.workCenters());
        assertEquals(List.of("PM01", "PM02", "ZM01"), result.controlKeys());
        assertEquals(List.of("H", "MIN"), result.workUnits());
        assertEquals(List.of("H"), result.durationUnits());
        assertEquals(10, result.operationNumberStart());
        assertEquals(10, result.operationNumberIncrement());
        assertEquals(BigDecimal.ONE, result.defaultWorkers());
        assertEquals(List.of("Running", "Shutdown"), result.systemConditions());
        assertEquals(2, result.workCenterDefaults().size());
        MaintenanceTaskListWorkCenterSuggestionDTO center = result.workCenterDefaults().stream()
                .filter(candidate -> candidate.workCenter().equals("MECH"))
                .findFirst().orElseThrow();
        assertEquals("MECH", center.workCenter());
        assertNull(center.controlKey());
        assertNull(center.workers());
        assertEquals("H", center.workUnit());
        assertEquals("Shutdown", center.systemCondition());
        MaintenanceTaskListWorkCenterSuggestionDTO workshop = result.workCenterDefaults().stream()
                .filter(candidate -> candidate.workCenter().equals("Workshop"))
                .findFirst().orElseThrow();
        assertEquals("ZM01", workshop.controlKey());
        assertNull(workshop.workers());
    }

    @Test
    void defaultsAreDeniedWithoutTaskListPermission() {
        User user = authorizedUser();
        user.getRole().setViewPermissions(Set.of());

        assertThrows(CustomException.class, () -> service.defaults(user));
    }

    @Test
    void groupCounterLookupUsesTheUsersVisibleOwnerScope() {
        User user = authorizedUser();
        when(taskListRepository.findGroupCounters(42L, "TL000009", 7L)).thenReturn(List.of());

        assertEquals(List.of(), service.groupCounters(" TL000009 ", user));
        verify(taskListRepository).findGroupCounters(42L, "TL000009", 7L);
    }

    @Test
    void groupCounterLookupIsDeniedWithoutTaskListViewPermission() {
        User user = authorizedUser();
        user.getRole().setViewPermissions(Set.of());

        assertThrows(CustomException.class, () -> service.groupCounters("TL000009", user));
    }

    @Test
    void groupCounterLookupWidensScopeOnlyWithViewOtherPermission() {
        User user = authorizedUser();
        user.getRole().setViewOtherPermissions(Set.of(PermissionEntity.TASK_LISTS));
        when(taskListRepository.findGroupCounters(42L, "TL000009", null)).thenReturn(List.of());

        assertEquals(List.of(), service.groupCounters("TL000009", user));
        verify(taskListRepository).findGroupCounters(42L, "TL000009", null);
    }

    @Test
    void activeTaskListOptionsUseTheLightweightOwnerScopedQuery() {
        User user = authorizedUser();
        when(taskListRepository.searchActiveOptions(any(), any(), any(), any()))
                .thenReturn(org.springframework.data.domain.Page.empty());

        var result = service.searchActiveOptions(user, " pump ", 0, 10);

        assertEquals(0, result.getTotalElements());
        verify(taskListRepository).searchActiveOptions(eq(42L), eq("pump"), eq(7L), any());
    }

    @Test
    void groupCounterLookupRefusesToSilentlyDropComponentsTheUserCannotView() {
        User user = authorizedUser();
        user.getRole().setViewPermissions(Set.of(PermissionEntity.TASK_LISTS, PermissionEntity.PARTS_AND_MULTIPARTS));
        Part part = new Part();
        part.setCreatedBy(99L);
        part.setAssignedTo(List.of());
        TaskListOperation operation = new TaskListOperation();
        TaskListOperationMaterial material = new TaskListOperationMaterial();
        material.setPart(part);
        operation.setMaterials(List.of(material));
        MaintenanceTaskList counter = new MaintenanceTaskList();
        counter.setOperations(List.of(operation));
        when(taskListRepository.findGroupCounters(42L, "TL000009", 7L)).thenReturn(List.of(counter));

        CustomException error = assertThrows(CustomException.class,
                () -> service.groupCounters("TL000009", user));

        assertEquals("task_list_copy_parts_not_accessible", error.getMessage());
    }

    @Test
    void laborWorkIsDerivedOnTheServerOnlyForCompatibleHourUnits() {
        assertEquals(new BigDecimal("7.500"), MaintenanceTaskListService.calculateLaborWork(
                new BigDecimal("2.5"), "h", new BigDecimal("3"), "H"));
        assertEquals(new BigDecimal("0.125"), MaintenanceTaskListService.calculateLaborWork(
                new BigDecimal("2.5"), "MIN", new BigDecimal("3"), "H"));
        assertEquals(new BigDecimal("90.000"), MaintenanceTaskListService.calculateLaborWork(
                new BigDecimal("1.5"), "HOUR", new BigDecimal("1"), "MIN"));
        assertNull(MaintenanceTaskListService.calculateLaborWork(
                new BigDecimal("2.5"), "SHIFT", new BigDecimal("3"), "H"));
        assertNull(MaintenanceTaskListService.calculateLaborWork(
                new BigDecimal("0"), "H", new BigDecimal("3"), "H"));
    }

    @Test
    void deleteRefusesTaskListsStillReferencedByPreventiveMaintenance() {
        User user = authorizedUser();
        MaintenanceTaskList taskList = new MaintenanceTaskList();
        taskList.setId(81L);
        taskList.setCreatedBy(user.getId());
        when(taskListRepository.findByIdAndCompany_Id(81L, 42L)).thenReturn(Optional.of(taskList));
        when(workOrderRepository.countByMaintenanceTaskListIdAndCompany_Id(81L, 42L)).thenReturn(0L);
        when(scheduleRepository.countUsingMaintenanceTaskList(42L, 81L)).thenReturn(1L);

        CustomException error = assertThrows(CustomException.class, () -> service.delete(81L, user));

        assertEquals("task_list_in_use_by_preventive_maintenance", error.getMessage());
        assertEquals(HttpStatus.CONFLICT, error.getHttpStatus());
        verify(taskListRepository, org.mockito.Mockito.never()).delete(taskList);
    }

    @Test
    void createAutomaticallyAllocatesNextGroupAndCounter() {
        User user = authorizedUser();
        user.getRole().setCreatePermissions(Set.of(PermissionEntity.TASK_LISTS));
        when(taskListRepository.lockCompanyForCounterGeneration(42L)).thenReturn(42L);
        when(groupSequenceRepository.findByCompany_Id(42L)).thenReturn(Optional.empty());
        when(taskListRepository.findGroupCodes(42L)).thenReturn(List.of("TL000008"));
        when(counterRepository.findByCompany_IdAndGroupCodeIgnoreCase(42L, "TL000009"))
                .thenReturn(Optional.empty());
        when(taskListRepository.findCountersForGroup(42L, "TL000009")).thenReturn(List.of("01", "03"));
        when(taskListRepository.save(any(MaintenanceTaskList.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        MaintenanceTaskListDTO input = new MaintenanceTaskListDTO(null, null, null, null,
                "Lubrication route", "GENERAL", null, null, null, null, null, "DRAFT", List.of(), null);

        MaintenanceTaskListDTO created = service.create(input, user);

        assertEquals("TL000009", created.groupCode());
        assertEquals("04", created.groupCounter());
        ArgumentCaptor<MaintenanceTaskListGroupSequence> sequence =
                ArgumentCaptor.forClass(MaintenanceTaskListGroupSequence.class);
        verify(groupSequenceRepository).save(sequence.capture());
        assertEquals(10, sequence.getValue().getNextGroupNumber());
        ArgumentCaptor<MaintenanceTaskListCounter> counter = ArgumentCaptor.forClass(MaintenanceTaskListCounter.class);
        verify(counterRepository).save(counter.capture());
        assertEquals(5, counter.getValue().getNextCounter());
    }

    private User authorizedUser() {
        Company company = new Company();
        company.setId(42L);
        SubscriptionPlan plan = SubscriptionPlan.builder().features(Set.of(PlanFeatures.PREVENTIVE_MAINTENANCE)).build();
        Subscription subscription = Subscription.builder().subscriptionPlan(plan).build();
        company.setSubscription(subscription);
        Role role = Role.builder().viewPermissions(Set.of(PermissionEntity.TASK_LISTS)).build();
        User user = new User();
        user.setId(7L);
        user.setCompany(company);
        user.setRole(role);
        return user;
    }
}
