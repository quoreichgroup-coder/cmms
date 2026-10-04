package com.grash.model;

import com.grash.exception.CustomException;
import com.grash.model.enums.PermissionEntity;
import com.grash.model.enums.PlanFeatures;
import com.grash.model.enums.RoleType;
import com.grash.utils.Helper;
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.Set;
import static org.junit.jupiter.api.Assertions.*;

class AnalyticsAccessScopeTest {
    private User user(RoleType type) {
        User user = new User(); Role role = new Role(); role.setRoleType(type);
        role.setViewPermissions(Set.of(PermissionEntity.ANALYTICS)); user.setRole(role);
        Company company = new Company(); company.setId(1L); user.setCompany(company);
        return user;
    }
    @Test void superadminCanReadAnalyticsWithoutAnOrganizationSubscription() {
        assertTrue(user(RoleType.ROLE_SUPER_ADMIN).canSeeAnalytics());
    }
    @Test void clientWithoutSubscriptionIsDeniedWithoutCrashing() {
        assertFalse(user(RoleType.ROLE_CLIENT).canSeeAnalytics());
    }
    @Test void superadminScopeRemainsItsCompany() {
        User admin = user(RoleType.ROLE_SUPER_ADMIN);
        assertEquals(1L, Helper.resolveCompanyId(admin, null));
        assertEquals(1L, Helper.resolveCompanyId(admin, 1L));
        assertThrows(CustomException.class, () -> Helper.resolveCompanyId(admin, 99L));
    }
    @Test void clientCannotSelectAnUnrelatedCompany() {
        assertThrows(CustomException.class, () -> Helper.resolveCompanyId(user(RoleType.ROLE_CLIENT), 99L));
    }
    @Test void permittedClientRetainsItsAnalyticsAccess() {
        User client = user(RoleType.ROLE_CLIENT); Subscription subscription = new Subscription();
        SubscriptionPlan plan = new SubscriptionPlan(); plan.setFeatures(Set.of(PlanFeatures.ANALYTICS));
        subscription.setSubscriptionPlan(plan); client.getCompany().setSubscription(subscription);
        assertTrue(client.canSeeAnalytics());
        client.getRole().setViewPermissions(Set.of());
        assertFalse(client.canSeeAnalytics());
    }
}
