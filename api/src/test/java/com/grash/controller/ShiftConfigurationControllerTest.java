package com.grash.controller;

import com.grash.dto.shiftConfiguration.ShiftConfigurationShowDTO;
import com.grash.mapper.ShiftConfigurationMapper;
import com.grash.model.ShiftConfiguration;
import com.grash.model.User;
import com.grash.service.ShiftConfigurationService;
import com.grash.service.UserService;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.*;

class ShiftConfigurationControllerTest {
    private final ShiftConfigurationService service = mock(ShiftConfigurationService.class);
    private final ShiftConfigurationMapper mapper = mock(ShiftConfigurationMapper.class);
    private final UserService userService = mock(UserService.class);
    private final ShiftConfigurationController controller =
            new ShiftConfigurationController(service, mapper, userService);

    @Test
    void currentUserEndpointReturnsEmptyConfigurationWhenNoneExists() {
        User authenticatedUser = new User();

        ShiftConfigurationShowDTO response = controller.getCurrentUserShift(authenticatedUser);

        assertNotNull(response);
        assertEquals(false, response.isEnabled());
        assertNotNull(response.getDays());
        assertNotNull(response.getExceptions());
        verifyNoInteractions(mapper, service, userService);
    }

    @Test
    void currentUserEndpointMapsOnlyTheAuthenticatedUsersConfiguration() {
        User authenticatedUser = new User();
        ShiftConfiguration ownConfiguration = new ShiftConfiguration();
        authenticatedUser.setShiftConfiguration(ownConfiguration);
        ShiftConfigurationShowDTO expected = new ShiftConfigurationShowDTO();
        when(mapper.toShowDto(ownConfiguration)).thenReturn(expected);

        assertEquals(expected, controller.getCurrentUserShift(authenticatedUser));

        verify(mapper).toShowDto(ownConfiguration);
        verifyNoInteractions(service, userService);
    }
}
