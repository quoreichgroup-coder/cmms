package com.grash.service;

import com.grash.dto.apiKey.ApiKeyPatchDTO;
import com.grash.exception.CustomException;
import com.grash.mapper.ApiKeyMapper;
import com.grash.model.ApiKey;
import com.grash.model.Company;
import com.grash.model.Role;
import com.grash.model.User;
import com.grash.model.enums.PermissionEntity;
import com.grash.repository.ApiKeyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ApiKeyServiceTenantIsolationTest {
    @Mock private ApiKeyRepository apiKeyRepository;
    @Mock private ApiKeyMapper apiKeyMapper;
    @Mock private LicenseService licenseService;

    private ApiKeyService apiKeyService;
    private User user;

    @BeforeEach
    void setUp() {
        apiKeyService = new ApiKeyService(apiKeyRepository, apiKeyMapper, licenseService);
        user = new User();
        Company company = new Company();
        company.setId(7L);
        user.setCompany(company);
        Role role = new Role();
        role.setViewPermissions(Set.of(PermissionEntity.SETTINGS));
        role.setEditOtherPermissions(Set.of(PermissionEntity.SETTINGS));
        user.setRole(role);
    }

    @Test
    void deleteDoesNotTouchKeyOutsideUsersCompany() {
        when(apiKeyRepository.findByIdAndCompany_Id(42L, 7L)).thenReturn(Optional.empty());

        assertThrows(CustomException.class, () -> apiKeyService.delete(42L, user));

        verify(apiKeyRepository, never()).delete(any(ApiKey.class));
        verify(apiKeyRepository, never()).deleteById(anyLong());
    }

    @Test
    void rotateDoesNotRevealOrRevokeKeyOutsideUsersCompany() {
        when(apiKeyRepository.findByIdAndCompany_Id(42L, 7L)).thenReturn(Optional.empty());

        assertThrows(CustomException.class, () -> apiKeyService.rotateKey(42L, user));

        verify(apiKeyRepository, never()).save(any(ApiKey.class));
    }

    @Test
    void updateDoesNotLoadOrModifyKeyOutsideUsersCompany() {
        when(apiKeyRepository.findByIdAndCompany_Id(42L, 7L)).thenReturn(Optional.empty());

        assertThrows(CustomException.class,
                () -> apiKeyService.update(42L, new ApiKeyPatchDTO(), user));

        verify(apiKeyRepository, never()).findById(anyLong());
        verify(apiKeyMapper, never()).updateApiKey(any(ApiKey.class), any(ApiKeyPatchDTO.class));
        verify(apiKeyRepository, never()).save(any(ApiKey.class));
    }

    @Test
    void readOnlySettingsRoleCannotCreateRotateOrDeleteApiKeys() {
        user.getRole().setEditOtherPermissions(Set.of());

        assertThrows(CustomException.class,
                () -> apiKeyService.create(new com.grash.dto.apiKey.ApiKeyPostDTO(), user));
        assertThrows(CustomException.class, () -> apiKeyService.rotateKey(42L, user));
        assertThrows(CustomException.class, () -> apiKeyService.delete(42L, user));

        verifyNoInteractions(apiKeyRepository, apiKeyMapper, licenseService);
    }

    @Test
    void companyOwnerCanManageApiKeysWithoutRoleEditPermission() {
        user.setOwnsCompany(true);
        ApiKey apiKey = new ApiKey();

        when(apiKeyRepository.findByIdAndCompany_Id(42L, 7L)).thenReturn(Optional.of(apiKey));
        apiKeyService.delete(42L, user);

        verify(apiKeyRepository).findByIdAndCompany_Id(42L, 7L);
        verify(apiKeyRepository).delete(apiKey);
    }
}
