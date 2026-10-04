package com.grash.controller;

import com.grash.exception.CustomException;
import com.grash.model.User;
import com.grash.model.Role;
import com.grash.model.enums.RoleType;
import com.grash.service.LicenseService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LicenseControllerTest {
    private final LicenseService service = mock(LicenseService.class);
    private final LicenseController controller = new LicenseController(service);

    @Test void regularUsersAndAnonymousCannotActivate() {
        User user = new User();
        var request = new LicenseController.ActivationRequest("secret-key");
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(CustomException.class,
                () -> controller.activate(user, request)).getHttpStatus());
        assertThrows(CustomException.class, () -> controller.activate(null, request));
        assertThrows(CustomException.class, () -> controller.activationConfig(user));
        verifyNoInteractions(service);
    }

    @Test void companyOwnerCanActivate() {
        User owner = new User(); owner.setOwnsCompany(true);
        controller.activate(owner, new LicenseController.ActivationRequest("secret-key"));
        verify(service).activate("secret-key");
    }

    @Test void superadminCanActivate() {
        User admin = new User(); Role role = new Role(); role.setRoleType(RoleType.ROLE_SUPER_ADMIN); admin.setRole(role);
        controller.activate(admin, new LicenseController.ActivationRequest("secret-key"));
        verify(service).activate("secret-key");
    }
}
