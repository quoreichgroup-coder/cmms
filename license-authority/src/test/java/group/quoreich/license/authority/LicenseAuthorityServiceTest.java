package group.quoreich.license.authority;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.web.server.ResponseStatusException;

import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LicenseAuthorityServiceTest {
    @Mock JdbcTemplate jdbc;
    @Mock LicenseSigner signer;
    LicenseAuthorityService service;

    @BeforeEach
    void setUp() {
        service = new LicenseAuthorityService(jdbc, new ObjectMapper(), signer, 30);
    }

    @Test
    void issueBindsDatesAsJdbcTimestamps() {
        Instant start = Instant.parse("2026-01-01T00:00:00Z");
        Instant end = start.plusSeconds(86400);
        service.issue(new LicenseIssueRequest("Customer", "ENTERPRISE", "SUBSCRIPTION",
                2, 3, Set.of(), start, end, end));
        verify(jdbc).update(contains("INSERT INTO license_record"), any(UUID.class), anyString(),
                anyString(), eq("Customer"), eq("ENTERPRISE"), eq("SUBSCRIPTION"), eq(2), eq(3),
                eq("[]"), eq(Timestamp.from(start)), eq(Timestamp.from(end)), eq(Timestamp.from(end)));
    }

    @Test
    void perpetualLicenseAllowsNullExpiryAndMaintenance() {
        Instant start = Instant.parse("2026-01-01T00:00:00Z");
        service.issue(new LicenseIssueRequest("Customer", "ENTERPRISE", "PERPETUAL",
                2, 0, Set.of(), start, null, null));
        verify(jdbc).update(contains("INSERT INTO license_record"), any(UUID.class), anyString(),
                anyString(), eq("Customer"), eq("ENTERPRISE"), eq("PERPETUAL"), eq(2), eq(0),
                eq("[]"), eq(Timestamp.from(start)), isNull(), isNull());
    }

    @Test
    @SuppressWarnings("unchecked")
    void deactivatedInstallationCannotReclaimAnOccupiedSlot() throws Exception {
        UUID licenseId = UUID.randomUUID();
        UUID activationId = UUID.randomUUID();
        ResultSet license = mock(ResultSet.class);
        when(license.getObject("id", UUID.class)).thenReturn(licenseId);
        when(license.getString(anyString())).thenAnswer(call -> switch ((String) call.getArgument(0)) {
            case "status" -> "ACTIVE";
            case "customer_name" -> "Customer";
            case "edition" -> "ENTERPRISE";
            case "license_type" -> "PERPETUAL";
            case "entitlements" -> "[]";
            default -> null;
        });
        when(license.getTimestamp(anyString())).thenAnswer(call ->
                "starts_at".equals(call.getArgument(0)) ? Timestamp.from(Instant.EPOCH) : null);
        ResultSet activation = mock(ResultSet.class);
        when(activation.getObject("id", UUID.class)).thenReturn(activationId);
        when(activation.getString("environment")).thenReturn("PRODUCTION");
        when(activation.getTimestamp("deactivated_at")).thenReturn(Timestamp.from(Instant.EPOCH));
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class))).thenAnswer(call -> {
            String sql = call.getArgument(0);
            RowMapper<?> rowMapper = call.getArgument(1);
            return List.of(rowMapper.mapRow(sql.contains("FROM license_record") ? license : activation, 0));
        });
        when(jdbc.queryForObject(anyString(), eq(Boolean.class), eq(licenseId), eq("PRODUCTION")))
                .thenReturn(true);
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.activate("key", "a".repeat(64), "PRODUCTION"));
        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
        verify(jdbc, never()).update(anyString(), any(Object[].class));
        verifyNoInteractions(signer);
    }
}
