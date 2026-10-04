package com.grash.controller;

import com.grash.controller.analytics.WOAnalyticsController;
import com.grash.dto.DateRange;
import com.grash.model.*;
import com.grash.model.enums.RoleType;
import com.grash.exception.CustomException;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.access.AccessDeniedException;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AnalyticsMethodSecurityTest {
    @Configuration @EnableMethodSecurity
    static class Config {
        @Bean WOAnalyticsController reports() throws Exception {
            var constructor = WOAnalyticsController.class.getConstructors()[0];
            Object[] dependencies = Arrays.stream(constructor.getParameterTypes()).map(type -> mock(type)).toArray();
            return (WOAnalyticsController) constructor.newInstance(dependencies);
        }
    }
    private User admin() {
        User user = new User(); user.setId(1L); Role role = new Role(); role.setRoleType(RoleType.ROLE_SUPER_ADMIN);
        user.setRole(role); Company company = new Company(); company.setId(1L); user.setCompany(company); return user;
    }
    private DateRange range() { DateRange range = new DateRange(); range.setStart(new Date(0)); range.setEnd(new Date()); return range; }
    private void authenticate(String role) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "test", "unused", List.of(new SimpleGrantedAuthority(role))));
    }
    @Test void superadminCanReadItsOwnEmptyReportThroughRealMethodSecurity() {
        try (var context = new AnnotationConfigApplicationContext(Config.class)) {
            authenticate("ROLE_SUPER_ADMIN");
            var result = context.getBean(WOAnalyticsController.class).getCompleteStats(admin(), range(), null);
            assertEquals(200, result.getStatusCode().value()); assertEquals(0, result.getBody().getTotal());
        } finally { SecurityContextHolder.clearContext(); }
    }
    @Test void superadminCannotReadAnUnrelatedCompanyThroughTheSameEndpoint() {
        try (var context = new AnnotationConfigApplicationContext(Config.class)) {
            authenticate("ROLE_SUPER_ADMIN");
            assertThrows(CustomException.class, () -> context.getBean(WOAnalyticsController.class).getCompleteStats(admin(), range(), 99L));
        } finally { SecurityContextHolder.clearContext(); }
    }
    @Test void unrelatedRoleCannotReadReportsEvenWithAnAdminArgument() {
        try (var context = new AnnotationConfigApplicationContext(Config.class)) {
            authenticate("ROLE_OTHER");
            assertThrows(AccessDeniedException.class, () -> context.getBean(WOAnalyticsController.class).getCompleteStats(admin(), range(), null));
        } finally { SecurityContextHolder.clearContext(); }
    }
}
