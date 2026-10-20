package com.grash.controller;

import com.grash.model.User;
import com.grash.model.UserSettings;
import com.grash.exception.CustomException;
import com.grash.service.UserService;
import com.grash.service.UserSettingsService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserSettingsControllerTest {
    @Mock
    private UserSettingsService userSettingsService;
    @Mock
    private UserService userService;
    @Mock
    private HttpServletRequest request;

    @Test
    void genericSettingsPatchCannotRedirectTheSaveThroughThePayloadId() {
        UserSettings ownSettings = new UserSettings();
        ownSettings.setId(12L);
        User user = new User();
        user.setUserSettings(ownSettings);
        when(userService.whoami(request)).thenReturn(user);
        when(userSettingsService.findById(12L)).thenReturn(Optional.of(ownSettings));

        UserSettings payload = new UserSettings();
        payload.setId(99L);
        when(userSettingsService.update(payload)).thenReturn(payload);

        UserSettingsController controller = new UserSettingsController(userSettingsService, userService);
        UserSettings result = controller.patch(payload, 12L, request);

        assertEquals(12L, result.getId());
        verify(userSettingsService).update(payload);
        verify(userSettingsService, never()).findById(99L);
    }

    @Test
    void genericSettingsPatchRejectsAnotherUsersPathId() {
        UserSettings ownSettings = new UserSettings();
        ownSettings.setId(12L);
        UserSettings otherSettings = new UserSettings();
        otherSettings.setId(99L);
        User user = new User();
        user.setUserSettings(ownSettings);
        when(userService.whoami(request)).thenReturn(user);
        when(userSettingsService.findById(99L)).thenReturn(Optional.of(otherSettings));

        UserSettingsController controller = new UserSettingsController(userSettingsService, userService);
        assertThrows(CustomException.class, () -> controller.patch(otherSettings, 99L, request));
        verify(userSettingsService, never()).update(any(UserSettings.class));
    }
}
