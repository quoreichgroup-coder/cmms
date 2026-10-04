package com.grash.service;

import com.grash.dto.license.LicensingState;
import com.grash.exception.CustomException;
import com.grash.model.Company;
import com.grash.model.Role;
import com.grash.model.User;
import com.grash.model.enums.RoleType;
import com.grash.repository.LicenseSeatRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LicenseSeatServiceTest {
    @Mock LicenseSeatRepository seats;
    @Mock LicenseService licenses;
    @Mock EntityManager entityManager;
    @InjectMocks LicenseSeatService guard;
    LicensingState state;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(guard, "provider", "QUOREICH");
        state = LicensingState.builder().valid(true).hasLicense(true).seatsFull(2).seatsLight(5).build();
        lenient().when(licenses.getLicensingState()).thenAnswer(call -> state);
    }

    @Test
    void lockAndFlushPrecedeCountingFullSeats() {
        when(seats.countFullUsers()).thenReturn(2L);
        assertThrows(CustomException.class, () -> guard.checkAdditionalSeats(1, 0));
        var ordered = inOrder(seats, entityManager);
        ordered.verify(seats).lockSeats();
        ordered.verify(entityManager).flush();
        ordered.verify(seats).countFullUsers();
        verify(seats, never()).countLightUsers();
    }

    @Test
    void lightSeatLimitIsIndependentFromFullSeats() {
        when(seats.countLightUsers()).thenReturn(5L);
        assertThrows(CustomException.class, () -> guard.checkAdditionalSeats(0, 1));
        verify(seats, never()).countFullUsers();
    }

    @Test
    void switchingToLightRoleChecksOnlyDestinationSeats() {
        User user = user(true, true);
        Role light = role(false);
        when(seats.countLightUsers()).thenReturn(5L);
        assertThrows(CustomException.class, () -> guard.checkTransition(user, light, true));
        verify(seats, never()).countFullUsers();
    }

    @Test
    void enabledUserKeepsExistingSeatWhenRoleTypeDoesNotChange() {
        User user = user(false, true);
        guard.checkTransition(user, role(false), true);
        verifyNoInteractions(seats, entityManager);
    }

    @Test
    void batchReactivationChecksAllNewSeatsTogether() {
        when(seats.countFullUsers()).thenReturn(1L);
        assertThrows(CustomException.class, () -> guard.checkUsersToEnable(
                List.of(user(true, false), user(true, false))));
        verify(seats).countFullUsers();
    }

    @Test
    void demosAndSuperadminsDoNotConsumeCustomerSeats() {
        User demo = user(true, true);
        demo.getCompany().setDemo(true);
        User superadmin = user(true, true);
        superadmin.getRole().setRoleType(RoleType.ROLE_SUPER_ADMIN);
        guard.checkNewUser(demo);
        guard.checkNewUser(superadmin);
        verifyNoInteractions(seats, entityManager);
    }

    @Test
    void unlimitedLicenseDoesNotEnforceSeatCounts() {
        state.setEntitlements(Set.of("UNLIMITED_USERS"));
        assertDoesNotThrow(() -> guard.checkAdditionalSeats(1000, 1000));
        verifyNoInteractions(seats, entityManager);
    }

    @Test
    void readOnlyLicenseRejectsNewSeats() {
        state.setValid(false);
        state.setReadOnly(true);
        assertThrows(CustomException.class, () -> guard.checkAdditionalSeats(1, 0));
        verifyNoInteractions(seats, entityManager);
    }

    @Test
    void legacyProviderDoesNotTakeQuoreichLocks() {
        ReflectionTestUtils.setField(guard, "provider", "KEYGEN");
        assertFalse(guard.lockForUserChanges());
        guard.checkAdditionalSeats(1, 1);
        verifyNoInteractions(seats, entityManager);
    }

    private User user(boolean paid, boolean enabled) {
        User user = new User();
        user.setRole(role(paid));
        user.setEnabled(enabled);
        user.setCompany(new Company());
        return user;
    }

    private Role role(boolean paid) {
        Role role = new Role();
        role.setPaid(paid);
        role.setRoleType(RoleType.ROLE_CLIENT);
        return role;
    }
}
