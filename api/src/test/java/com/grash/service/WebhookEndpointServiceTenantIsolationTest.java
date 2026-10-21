package com.grash.service;

import com.grash.dto.license.LicenseEntitlement;
import com.grash.dto.webhookEndpoint.WebhookEndpointPatchDTO;
import com.grash.dto.webhookEndpoint.WebhookEndpointPostDTO;
import com.grash.exception.CustomException;
import com.grash.mapper.WebhookEndpointMapper;
import com.grash.model.User;
import com.grash.model.enums.PermissionEntity;
import com.grash.model.enums.PlanFeatures;
import com.grash.repository.WebhookEndpointRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;

@ExtendWith(MockitoExtension.class)
class WebhookEndpointServiceTenantIsolationTest {
    @Mock private WebhookEndpointRepository repository;
    @Mock private WebhookEndpointMapper mapper;
    @Mock private LicenseService licenseService;

    private WebhookEndpointService service;
    private User user;

    @BeforeEach
    void setUp() {
        service = new WebhookEndpointService(repository, mapper, licenseService);
        user = mock(User.class, RETURNS_DEEP_STUBS);
        when(user.getRole().getViewPermissions()).thenReturn(Set.of(PermissionEntity.SETTINGS));
        when(user.getRole().getEditOtherPermissions()).thenReturn(Set.of(PermissionEntity.SETTINGS));
    }

    @Test
    void updateDoesNotLoadOrModifyEndpointOutsideUsersCompany() {
        when(user.getCompany().getId()).thenReturn(7L);
        when(user.getCompany().getSubscription().getSubscriptionPlan().getFeatures())
                .thenReturn(Set.of(PlanFeatures.WEBHOOK));
        when(licenseService.hasEntitlement(LicenseEntitlement.WEBHOOK)).thenReturn(true);
        when(repository.findByIdAndCompanyId(42L, 7L)).thenReturn(Optional.empty());

        assertThrows(CustomException.class,
                () -> service.update(42L, new WebhookEndpointPatchDTO(), user));

        verify(mapper, never()).updateWebhookEndpoint(any(), any());
        verify(repository, never()).save(any());
    }

    @Test
    void deleteDoesNotDeleteEndpointOutsideUsersCompany() {
        when(user.getCompany().getId()).thenReturn(7L);
        when(repository.findByIdAndCompanyId(42L, 7L)).thenReturn(Optional.empty());

        assertThrows(CustomException.class, () -> service.delete(42L, user));

        verify(repository, never()).delete(any(com.grash.model.WebhookEndpoint.class));
        verify(repository, never()).deleteById(anyLong());
    }

    @Test
    void readOnlySettingsRoleCannotCreateUpdateDeleteOrRotateWebhookSecrets() {
        when(user.getRole().getEditOtherPermissions()).thenReturn(Set.of());

        assertThrows(CustomException.class,
                () -> service.create(new WebhookEndpointPostDTO(), user));
        assertThrows(CustomException.class,
                () -> service.update(42L, new WebhookEndpointPatchDTO(), user));
        assertThrows(CustomException.class, () -> service.delete(42L, user));
        assertThrows(CustomException.class, () -> service.rotateSecret(42L, user));

        verifyNoInteractions(repository, mapper, licenseService);
    }

    @Test
    void companyOwnerCanManageWebhooksWithoutRoleEditPermission() {
        when(user.isOwnsCompany()).thenReturn(true);
        when(user.getCompany().getId()).thenReturn(7L);
        when(repository.findByIdAndCompanyId(42L, 7L)).thenReturn(Optional.empty());

        assertThrows(CustomException.class, () -> service.delete(42L, user));

        verify(repository).findByIdAndCompanyId(42L, 7L);
        verify(repository, never()).delete(any(com.grash.model.WebhookEndpoint.class));
    }
}
