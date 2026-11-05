package com.grash.service;

import com.grash.dto.MaintenanceTaskListDTO;
import com.grash.exception.CustomException;
import com.grash.model.*;
import com.grash.model.enums.PermissionEntity;
import com.grash.model.enums.PlanFeatures;
import com.grash.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MaintenanceTaskListUpdateTest {
    @InjectMocks private MaintenanceTaskListService service;
    @Mock private MaintenanceTaskListRepository taskListRepository;
    @Mock private MaintenanceTaskListCounterRepository counterRepository;
    @Mock private MaintenanceTaskListConfigurationRepository configurationRepository;
    @Mock private MaintenanceTaskListGroupSequenceRepository groupSequenceRepository;
    @Mock private TaskListOperationRepository operationRepository;
    @Mock private PartRepository partRepository;
    @Mock private WorkOrderRepository workOrderRepository;
    @Mock private AssetRepository assetRepository;
    @Mock private LocationRepository locationRepository;

    private User user;
    private MaintenanceTaskList taskList;

    @BeforeEach
    void setUp() {
        Company company = new Company();
        company.setId(42L);
        SubscriptionPlan plan = SubscriptionPlan.builder()
                .features(Set.of(PlanFeatures.PREVENTIVE_MAINTENANCE)).build();
        company.setSubscription(Subscription.builder().subscriptionPlan(plan).build());
        Role role = Role.builder()
                .viewPermissions(Set.of(PermissionEntity.TASK_LISTS, PermissionEntity.PARTS_AND_MULTIPARTS))
                .viewOtherPermissions(Set.of(PermissionEntity.PARTS_AND_MULTIPARTS))
                .build();
        user = new User();
        user.setId(7L);
        user.setCompany(company);
        user.setRole(role);

        taskList = new MaintenanceTaskList();
        taskList.setId(100L);
        taskList.setCompany(company);
        taskList.setCreatedBy(user.getId());
        taskList.setGroupCode("TL000001");
        taskList.setGroupCounter("01");
        taskList.setDescription("Pump inspection");
        taskList.setTaskListType("GENERAL");
        taskList.setStatus("DRAFT");
    }

    @Test
    void updateKeepsExistingOperationAndMaterialInstancesAndRemovesOnlyOmittedRows() {
        Part part = new Part();
        part.setId(31L);
        part.setCreatedBy(user.getId());
        part.setAssignedTo(List.of());

        TaskListOperation retained = operation(11L, "0010");
        TaskListOperation removed = operation(12L, "0020");
        TaskListOperationMaterial material = new TaskListOperationMaterial();
        material.setId(21L);
        material.setCompany(user.getCompany());
        material.setOperation(retained);
        material.setPart(part);
        material.setQuantity(BigDecimal.ONE);
        retained.setMaterials(new java.util.ArrayList<>(List.of(material)));
        taskList.setOperations(new java.util.ArrayList<>(List.of(retained, removed)));

        when(taskListRepository.findByIdAndCompany_Id(100L, 42L)).thenReturn(Optional.of(taskList));
        when(taskListRepository.save(any(MaintenanceTaskList.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(partRepository.findByIdAndCompany_Id(31L, 42L)).thenReturn(Optional.of(part));

        MaintenanceTaskListDTO.OperationDTO requestedOperation = new MaintenanceTaskListDTO.OperationDTO(
                11L, "0020", "Inspect coupling", null, null, null, null, null,
                null, null, null, null, 0,
                List.of(new MaintenanceTaskListDTO.MaterialDTO(21L, 31L, new BigDecimal("2"), "EA", null, null)));
        MaintenanceTaskListDTO request = new MaintenanceTaskListDTO(100L, "TL000001", "01", null,
                "Pump inspection", "GENERAL", null, null, null, null, null, "DRAFT",
                List.of(requestedOperation), user.getId());

        service.update(100L, request, user);

        assertEquals(1, taskList.getOperations().size());
        assertSame(retained, taskList.getOperations().get(0));
        assertEquals("0020", retained.getOperationNumber());
        assertEquals(1, retained.getMaterials().size());
        assertSame(material, retained.getMaterials().get(0));
        assertEquals(new BigDecimal("2"), material.getQuantity());
    }

    @Test
    void updateRejectsOperationIdThatDoesNotBelongToTheTaskList() {
        taskList.setOperations(new java.util.ArrayList<>(List.of(operation(11L, "0010"))));
        when(taskListRepository.findByIdAndCompany_Id(100L, 42L)).thenReturn(Optional.of(taskList));
        MaintenanceTaskListDTO.OperationDTO foreignOperation = new MaintenanceTaskListDTO.OperationDTO(
                999L, "0010", "Inspect coupling", null, null, null, null, null,
                null, null, null, null, 0, List.of());
        MaintenanceTaskListDTO request = new MaintenanceTaskListDTO(100L, "TL000001", "01", null,
                "Pump inspection", "GENERAL", null, null, null, null, null, "DRAFT",
                List.of(foreignOperation), user.getId());

        CustomException error = assertThrows(CustomException.class, () -> service.update(100L, request, user));

        assertEquals("task_list_operation_not_found", error.getMessage());
        verify(taskListRepository, never()).save(any());
    }

    private TaskListOperation operation(Long id, String number) {
        TaskListOperation operation = new TaskListOperation();
        operation.setId(id);
        operation.setCompany(user.getCompany());
        operation.setTaskList(taskList);
        operation.setOperationNumber(number);
        operation.setShortDescription("Inspect bearing");
        operation.setOperationOrder(Integer.parseInt(number) / 10 - 1);
        operation.setMaterials(new java.util.ArrayList<>());
        return operation;
    }
}
