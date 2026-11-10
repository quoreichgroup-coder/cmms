package com.grash.controller;

import com.grash.dto.MaintenanceTaskListDTO;
import com.grash.model.Role;
import com.grash.model.User;
import com.grash.model.enums.PermissionEntity;
import com.grash.service.MaintenanceTaskListConfigurationService;
import com.grash.service.MaintenanceTaskListService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.mock.web.MockMultipartFile;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MaintenanceTaskListCsvTest {
    private static final List<String> HEADERS = List.of("groupCode", "groupCounter", "description", "taskListType",
            "assetId", "locationId", "workCenter", "validFrom", "validTo", "status", "operationNumber",
            "operationOrder", "shortDescription", "longText", "operationWorkCenter", "controlKey", "workers",
            "plannedWork", "workUnit", "duration", "durationUnit", "systemCondition", "partId", "quantity",
            "unit", "storageLocation", "estimatedUnitCost");

    @Mock private MaintenanceTaskListService service;
    @Mock private MaintenanceTaskListConfigurationService configurationService;
    @Mock private com.grash.service.LicenseService licenseService;
    private MaintenanceTaskListController controller;
    private User user;

    @BeforeEach
    void setUp() {
        controller = new MaintenanceTaskListController(service, configurationService, licenseService);
        user = new User();
        user.setId(7L);
        user.setRole(Role.builder().createPermissions(Set.of(PermissionEntity.TASK_LISTS))
                .viewPermissions(Set.of(PermissionEntity.TASK_LISTS)).build());
    }

    private void stubCreate() {
        when(service.create(any(), eq(user))).thenAnswer(invocation -> {
            MaintenanceTaskListDTO dto = invocation.getArgument(0);
            return new MaintenanceTaskListDTO(1L, "TL000001", dto.groupCounter(), null, dto.description(),
                    dto.taskListType(), dto.assetId(), dto.locationId(), dto.workCenter(), dto.validFrom(),
                    dto.validTo(), dto.status(), dto.operations(), user.getId());
        });
    }

    @Test
    void importPreservesOperationOrderAndMaterialAssociations() throws Exception {
        stubCreate();
        String csv = csv(HEADERS, List.of(
                row("0020", "1", "Inspection", "20", "2"),
                row("0010", "0", "Lubrication", "10", "1")));

        controller.importCsv(file(csv), user);

        ArgumentCaptor<MaintenanceTaskListDTO> captor = ArgumentCaptor.forClass(MaintenanceTaskListDTO.class);
        verify(service).create(captor.capture(), eq(user));
        List<MaintenanceTaskListDTO.OperationDTO> operations = captor.getValue().operations();
        assertEquals(List.of("0010", "0020"), operations.stream()
                .map(MaintenanceTaskListDTO.OperationDTO::operationNumber).toList());
        assertEquals(List.of(0, 1), operations.stream()
                .map(MaintenanceTaskListDTO.OperationDTO::operationOrder).toList());
        assertEquals(List.of(10L, 20L), operations.stream()
                .map(operation -> operation.materials().get(0).partId()).toList());
    }

    @Test
    void importAcceptsLegacyCsvAndPreservesItsRowOrder() throws Exception {
        stubCreate();
        List<String> legacyHeaders = HEADERS.stream().filter(header -> !header.equals("operationOrder")).toList();
        String csv = csv(legacyHeaders, List.of(
                row("0020", "", "Inspection", "20", "2"),
                row("0010", "", "Lubrication", "10", "1")));

        controller.importCsv(file(csv), user);

        ArgumentCaptor<MaintenanceTaskListDTO> captor = ArgumentCaptor.forClass(MaintenanceTaskListDTO.class);
        verify(service).create(captor.capture(), eq(user));
        assertEquals(List.of("0020", "0010"), captor.getValue().operations().stream()
                .map(MaintenanceTaskListDTO.OperationDTO::operationNumber).toList());
    }

    @Test
    void exportIncludesOperationOrderForRoundTrip() throws Exception {
        MaintenanceTaskListDTO.OperationDTO second = operation("0020", "Inspection", 1, 20L);
        MaintenanceTaskListDTO.OperationDTO first = operation("0010", "Lubrication", 0, 10L);
        MaintenanceTaskListDTO taskList = new MaintenanceTaskListDTO(1L, "TL000001", "A", null, "Pump", "GENERAL",
                null, null, "MECH", LocalDate.of(2026, 1, 1), null, "ACTIVE", List.of(second, first), 7L);
        when(service.search(eq(user), eq(""), eq(0), eq(100)))
                .thenReturn(new PageImpl<>(List.of(taskList), PageRequest.of(0, 100), 1));

        String output = new String(controller.exportCsv(user).getBody(), StandardCharsets.UTF_8);

        assertTrue(output.lines().findFirst().orElseThrow().contains("operationOrder"));
        assertTrue(output.contains("0020,1,Inspection"));
        assertTrue(output.contains("0010,0,Lubrication"));
    }

    private static MaintenanceTaskListDTO.OperationDTO operation(String number, String description, int order,
                                                                  Long partId) {
        MaintenanceTaskListDTO.MaterialDTO material = new MaintenanceTaskListDTO.MaterialDTO(null, partId,
                BigDecimal.ONE, "EA", "STORES", BigDecimal.TEN);
        return new MaintenanceTaskListDTO.OperationDTO(null, number, description, null, "MECH", "PM01",
                BigDecimal.ONE, BigDecimal.ONE, "H", BigDecimal.ONE, "H", "Shutdown", order, List.of(material));
    }

    private static List<String> row(String operationNumber, String order, String description, String partId,
                                    String quantity) {
        return List.of("EXTERNAL-GROUP", "EXTERNAL-COUNTER", "Pump", "GENERAL", "", "", "MECH", "", "",
                "ACTIVE", operationNumber, order, description, "", "MECH", "PM01", "1", "1", "H", "1", "H",
                "Shutdown", partId, quantity, "EA", "STORES", "10");
    }

    private static String csv(List<String> headers, List<List<String>> rows) {
        List<String> lines = new ArrayList<>();
        lines.add(String.join(",", headers));
        for (List<String> row : rows) {
            List<String> filtered = new ArrayList<>(row);
            if (headers.size() == HEADERS.size() - 1) filtered.remove(11);
            lines.add(String.join(",", filtered));
        }
        return String.join("\n", lines);
    }

    private static MockMultipartFile file(String csv) {
        return new MockMultipartFile("file", "task-lists.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8));
    }
}
