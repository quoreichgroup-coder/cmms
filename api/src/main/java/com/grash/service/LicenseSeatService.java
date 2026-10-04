package com.grash.service;

import com.grash.dto.license.LicenseEntitlement;
import com.grash.dto.license.LicensingState;
import com.grash.exception.CustomException;
import com.grash.model.Role;
import com.grash.model.User;
import com.grash.model.enums.RoleType;
import com.grash.repository.LicenseSeatRepository;
import lombok.RequiredArgsConstructor;
import jakarta.persistence.EntityManager;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;

@Service
@RequiredArgsConstructor
@Transactional(propagation = Propagation.MANDATORY)
public class LicenseSeatService {
    private final LicenseSeatRepository seats;
    private final LicenseService licenses;
    private final EntityManager entityManager;
    @Value("${license-provider:KEYGEN}")
    private String provider;

    /** Must run before loading users whose enabled state or role may change. */
    public boolean lockForUserChanges() {
        if (!"QUOREICH".equalsIgnoreCase(provider) || !licenses.getLicensingState().isValid()) return false;
        seats.lockSeats();
        return true;
    }

    public void checkAdditionalSeats(Role role, int count) {
        if (role.getRoleType() == RoleType.ROLE_SUPER_ADMIN) return;
        checkAdditionalSeats(role.isPaid() ? count : 0, role.isPaid() ? 0 : count);
    }

    public void checkAdditionalSeats(int full, int light) {
        if (full < 0 || light < 0) throw new IllegalArgumentException("Seat increases must be nonnegative");
        if (!"QUOREICH".equalsIgnoreCase(provider) || (full == 0 && light == 0)) return;
        LicensingState state = licenses.getLicensingState();
        if (state.isReadOnly()) throw new CustomException("The license is read-only", HttpStatus.LOCKED);
        if (!state.isValid() || state.getEntitlements().contains(LicenseEntitlement.UNLIMITED_USERS.name())) return;
        seats.lockSeats();
        entityManager.flush();
        if (full > 0) enforce(seats.countFullUsers(), full, state.getSeatsFull(), "full");
        if (light > 0) enforce(seats.countLightUsers(), light, state.getSeatsLight(), "light");
    }

    public void checkNewUser(User user) {
        if (counted(user, user.getRole(), user.isEnabled())) checkAdditionalSeats(user.getRole(), 1);
    }

    public void checkTransition(User user, Role targetRole, boolean targetEnabled) {
        boolean oldCounted = counted(user, user.getRole(), user.isEnabled());
        boolean newCounted = counted(user, targetRole, targetEnabled);
        int full = (newCounted && targetRole.isPaid() ? 1 : 0) -
                (oldCounted && user.getRole().isPaid() ? 1 : 0);
        int light = (newCounted && !targetRole.isPaid() ? 1 : 0) -
                (oldCounted && !user.getRole().isPaid() ? 1 : 0);
        checkAdditionalSeats(Math.max(0, full), Math.max(0, light));
    }

    public void checkUsersToEnable(Collection<User> users) {
        int full = 0;
        int light = 0;
        for (User user : users) {
            if (!user.isEnabled() && counted(user, user.getRole(), true)) {
                if (user.getRole().isPaid()) full++; else light++;
            }
        }
        checkAdditionalSeats(full, light);
    }

    private boolean counted(User user, Role role, boolean enabled) {
        return enabled && role != null && role.getRoleType() != RoleType.ROLE_SUPER_ADMIN
                && user.getCompany() != null && !user.getCompany().isDemo();
    }

    private void enforce(long current, int increase, int limit, String type) {
        if (current + increase > limit) throw new CustomException(
                "The QUOREICH license allows " + limit + " " + type + " user seats.", HttpStatus.PAYMENT_REQUIRED);
    }
}
