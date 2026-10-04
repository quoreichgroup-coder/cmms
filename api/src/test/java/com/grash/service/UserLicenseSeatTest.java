package com.grash.service;

import com.grash.dto.license.LicensingState;
import com.grash.exception.CustomException;
import com.grash.model.Role;
import com.grash.model.User;
import com.grash.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserLicenseSeatTest {
    @Mock UserRepository users;
    @Mock LicenseService licenses;
    @Mock LicenseSeatService seatGuard;
    @InjectMocks UserService service;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "licenseProvider", "QUOREICH");
        when(licenses.getLicensingState()).thenReturn(LicensingState.builder()
                .valid(true).hasLicense(true).seatsFull(2).seatsLight(5).build());
    }

    @Test
    void fullSeatLimitRejectsAdditionalFullUser() {
        Role role = new Role();
        role.setPaid(true);
        doThrow(new CustomException("No full seats", org.springframework.http.HttpStatus.PAYMENT_REQUIRED))
                .when(seatGuard).checkAdditionalSeats(role, 1);
        assertThrows(CustomException.class, () -> service.checkUsageBasedLimit(1, role));
        verify(seatGuard).checkAdditionalSeats(role, 1);
    }

    @Test
    void lightSeatLimitRejectsAdditionalLightUser() {
        Role role = new Role();
        role.setPaid(false);
        doThrow(new CustomException("No light seats", org.springframework.http.HttpStatus.PAYMENT_REQUIRED))
                .when(seatGuard).checkAdditionalSeats(role, 1);
        assertThrows(CustomException.class, () -> service.checkUsageBasedLimit(1, role));
        verify(seatGuard).checkAdditionalSeats(role, 1);
    }

    @Test
    void reEnablingLightUserChecksLightSeatLimitBeforeSaving() {
        Role role = new Role();
        role.setPaid(false);
        User user = new User();
        user.setRole(role);
        user.setEnabled(false);
        doThrow(new CustomException("No light seats", org.springframework.http.HttpStatus.PAYMENT_REQUIRED))
                .when(seatGuard).checkTransition(user, role, true);
        assertThrows(CustomException.class, () -> service.enableUser(user));
        assertFalse(user.isEnabled());
        verify(users, never()).save(user);
    }

    @Test
    void invitingLightUserChecksLightSeatLimit() {
        Role role = new Role();
        role.setPaid(false);
        doThrow(new CustomException("No light seats", org.springframework.http.HttpStatus.PAYMENT_REQUIRED))
                .when(seatGuard).checkAdditionalSeats(role, 1);
        assertThrows(CustomException.class,
                () -> service.invite("new@example.com", role, new User(), true));
    }

    @Test
    void availableLightSeatDoesNotConsumeFullSeat() {
        Role role = new Role();
        role.setPaid(false);

        assertDoesNotThrow(() -> service.checkUsageBasedLimit(1, role));
        verify(seatGuard).checkAdditionalSeats(role, 1);
    }
}
