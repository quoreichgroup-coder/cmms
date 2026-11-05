package com.grash.service;

import com.grash.dto.MaintenanceTaskListConfigurationDTO;
import com.grash.exception.CustomException;
import com.grash.model.Company;
import com.grash.model.MaintenanceTaskListConfiguration;
import com.grash.model.Role;
import com.grash.model.User;
import com.grash.model.enums.PermissionEntity;
import com.grash.repository.MaintenanceTaskListConfigurationRepository;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MaintenanceTaskListConfigurationServiceTest {
    @InjectMocks private MaintenanceTaskListConfigurationService service;
    @Mock private MaintenanceTaskListConfigurationRepository repository;
    @Mock private CompanyConfigurationAuditService auditService;

    @Test
    void returnsDefaultsForCompaniesWithoutSavedConfiguration() {
        User user = userWith(Set.of(PermissionEntity.SETTINGS), Set.of());
        when(repository.findByCompany_Id(42L)).thenReturn(Optional.empty());

        MaintenanceTaskListConfigurationDTO result = service.get(user);

        assertEquals(10, result.operationNumberStart());
        assertEquals(10, result.operationNumberIncrement());
        assertEquals(BigDecimal.ONE, result.defaultWorkers());
        assertEquals("H", result.defaultWorkUnit());
    }

    @Test
    void persistsCompanyScopedSettingsAndNormalizesUnits() {
        User user = userWith(Set.of(PermissionEntity.SETTINGS), Set.of(PermissionEntity.SETTINGS));
        when(repository.findByCompany_Id(42L)).thenReturn(Optional.empty());
        when(repository.save(any(MaintenanceTaskListConfiguration.class))).thenAnswer(invocation -> {
            MaintenanceTaskListConfiguration saved = invocation.getArgument(0);
            saved.setId(11L);
            return saved;
        });
        MaintenanceTaskListConfigurationDTO request = new MaintenanceTaskListConfigurationDTO(
                20, 5, new BigDecimal("2.5"), "min", "h", " WC01 \nWC02\n", "PM01\n PM02");

        MaintenanceTaskListConfigurationDTO result = service.save(user, request);

        assertEquals(20, result.operationNumberStart());
        assertEquals(5, result.operationNumberIncrement());
        assertEquals(new BigDecimal("2.5"), result.defaultWorkers());
        assertEquals("MIN", result.defaultWorkUnit());
        assertEquals("WC01\nWC02", result.workCenterCatalog());
        assertEquals("PM01\nPM02", result.controlKeyCatalog());
        verify(auditService).record(any(), any(), any(), any(), any(), any());
    }

    @Test
    void rejectsDuplicateReferenceCodesWithoutPersisting() {
        User user = userWith(Set.of(PermissionEntity.SETTINGS), Set.of(PermissionEntity.SETTINGS));
        when(repository.findByCompany_Id(42L)).thenReturn(Optional.empty());
        MaintenanceTaskListConfigurationDTO request = new MaintenanceTaskListConfigurationDTO(
                10, 10, BigDecimal.ONE, "H", "H", "WC01\nwc01", "PM01");

        assertThrows(CustomException.class, () -> service.save(user, request));
        verify(repository, never()).save(any());
    }

    @Test
    void deniesUpdatesWithoutSettingsEditPermission() {
        User user = userWith(Set.of(PermissionEntity.SETTINGS), Set.of());
        MaintenanceTaskListConfigurationDTO request = new MaintenanceTaskListConfigurationDTO(
                10, 10, BigDecimal.ONE, "H", "H");

        assertThrows(CustomException.class, () -> service.save(user, request));
        verify(repository, never()).save(any());
    }

    @Test
    void rejectsDefaultWorkerCountsOutsideTheSettingsRange() {
        var validator = Validation.buildDefaultValidatorFactory().getValidator();
        MaintenanceTaskListConfigurationDTO request = new MaintenanceTaskListConfigurationDTO(
                10, 10, new BigDecimal("1000000"), "H", "H");

        assertEquals(1, validator.validate(request).size());
    }

    private User userWith(Set<PermissionEntity> view, Set<PermissionEntity> edit) {
        Company company = new Company();
        company.setId(42L);
        Role role = Role.builder().viewPermissions(view).editOtherPermissions(edit).build();
        User user = new User();
        user.setId(7L);
        user.setCompany(company);
        user.setRole(role);
        return user;
    }
}
