package com.grash.service;

import com.grash.dto.LdapLoginRequest;
import com.grash.exception.CustomException;
import com.grash.model.Company;
import com.grash.model.Role;
import com.grash.model.User;
import com.grash.model.enums.RoleCode;
import com.grash.model.enums.RoleType;
import com.grash.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.ldap.authentication.LdapAuthenticationProvider;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LdapServiceTest {
    @Mock UserRepository users;
    @Mock LicenseSeatService seats;
    @Mock PasswordEncoder passwords;
    @Mock RoleService roles;
    @Mock CompanyService companies;
    @Mock CacheService cache;
    @Mock RefreshTokenService refreshTokens;
    @Mock LdapAuthenticationProvider authentication;
    @InjectMocks LdapService ldap;
    Role lightRole;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(ldap, "ldapOrgAdmin", "owner@example.com");
        ReflectionTestUtils.setField(ldap, "ldapAuthenticationProvider", authentication);
        lightRole = Role.builder().code(RoleCode.LIMITED_TECHNICIAN).roleType(RoleType.ROLE_CLIENT).paid(false).build();
        when(roles.findDefaultRoles()).thenReturn(List.of(lightRole));
    }

    @Test
    void newLdapUserCannotBeSavedWhenNoSeatIsAvailable() {
        when(companies.findByOwnerEmailAndOwnsCompany("owner@example.com")).thenReturn(Optional.of(new Company()));
        when(passwords.encode(anyString())).thenReturn("encoded");
        doThrow(new CustomException("No seats available", HttpStatus.PAYMENT_REQUIRED))
                .when(seats).checkNewUser(any(User.class));

        assertThrows(CustomException.class, () -> ldap.signinLdap(new LdapLoginRequest("tech", "password")));

        verify(users, never()).save(any());
        verifyNoInteractions(refreshTokens);
    }

    @Test
    void roleMappingChecksDestinationQuotaBeforeChangingRole() {
        Role previous = Role.builder().roleType(RoleType.ROLE_CLIENT).paid(true).build();
        User user = new User();
        user.setRole(previous);
        user.setCompany(new Company());
        user.setEnabled(true);
        user.setEmail("tech@local");
        user.setSsoProviderId("tech");
        when(users.findBySsoProviderIdAndSsoProvider("tech", "LDAP")).thenReturn(Optional.of(user));
        doThrow(new CustomException("No light seats", HttpStatus.PAYMENT_REQUIRED))
                .when(seats).checkTransition(user, lightRole, true);

        assertThrows(CustomException.class, () -> ldap.signinLdap(new LdapLoginRequest("tech", "password")));

        assertSame(previous, user.getRole());
        verify(users, never()).save(any());
        verifyNoInteractions(refreshTokens);
    }
}
