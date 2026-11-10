package group.quoreich.license.authority;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class LicenseAuthorityService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final LicenseSigner signer;
    private final int leaseDays;

    public LicenseAuthorityService(JdbcTemplate jdbc, ObjectMapper mapper, LicenseSigner signer,
                                   @Value("${license-authority.lease-days:30}") int leaseDays) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.signer = signer;
        this.leaseDays = leaseDays;
    }

    public static final String API_ACTOR = "api-token";

    /** Admin API: free entitlements, no customer record; QPM treats it as a pre-catalogue licence. */
    @Transactional
    public Map<String, Object> issue(LicenseIssueRequest request) {
        return issue(request, null, null, 1, API_ACTOR);
    }

    @Transactional
    public Map<String, Object> issue(LicenseIssueRequest request, UUID customerId, String planCode,
                                     int catalogVersion, String actor) {
        if ("SUBSCRIPTION".equals(request.licenseType()) && request.expiresAt() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Subscription licenses require expiresAt");
        }
        if (request.expiresAt() != null && !request.expiresAt().isAfter(request.startsAt())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "expiresAt must be after startsAt");
        }
        UUID id = UUID.randomUUID();
        String key = createLicenseKey();
        String keyHash = sha256(key);
        String entitlements;
        try {
            entitlements = mapper.writeValueAsString(new TreeSet<>(request.entitlements()));
        } catch (Exception e) {
            throw new IllegalStateException("Could not encode license entitlements", e);
        }
        jdbc.update("""
                INSERT INTO license_record
                  (id, key_hash, key_hint, customer_name, edition, license_type, status,
                   seats_full, seats_light, entitlements, starts_at, expires_at, maintenance_until,
                   customer_id, plan_code, catalog_version)
                VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, id, keyHash, key.substring(key.length() - 8), request.customerName(), request.edition(),
                request.licenseType(), request.seatsFull(), request.seatsLight(), entitlements,
                timestamp(request.startsAt()), timestamp(request.expiresAt()), timestamp(request.maintenanceUntil()),
                customerId, planCode, catalogVersion);
        Map<String, Object> issued = new LinkedHashMap<>();
        issued.put("edition", request.edition());
        issued.put("licenseType", request.licenseType());
        issued.put("seatsFull", request.seatsFull());
        issued.put("seatsLight", request.seatsLight());
        if (planCode != null) issued.put("plan", planCode);
        logEvent(id, null, "LICENSE_ISSUED", issued, actor);
        return Map.of("id", id, "licenseKey", key, "keyHint", key.substring(key.length() - 8),
                "status", "ACTIVE", "warning", "Store this key securely; it is shown only once.");
    }

    public List<Map<String, Object>> list() {
        return jdbc.query("""
                SELECT id, key_hint, customer_name, edition, license_type, status,
                       seats_full, seats_light, entitlements, starts_at, expires_at,
                       maintenance_until, created_at
                FROM license_record ORDER BY created_at DESC
                """, (rs, row) -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", rs.getObject("id", UUID.class));
            item.put("keyHint", rs.getString("key_hint"));
            item.put("customerName", rs.getString("customer_name"));
            item.put("edition", rs.getString("edition"));
            item.put("licenseType", rs.getString("license_type"));
            item.put("status", rs.getString("status"));
            item.put("seatsFull", rs.getInt("seats_full"));
            item.put("seatsLight", rs.getInt("seats_light"));
            item.put("entitlements", readEntitlements(rs.getString("entitlements")));
            item.put("startsAt", rs.getTimestamp("starts_at").toInstant());
            item.put("expiresAt", rs.getTimestamp("expires_at") == null ? null : rs.getTimestamp("expires_at").toInstant());
            item.put("maintenanceUntil", rs.getTimestamp("maintenance_until") == null ? null : rs.getTimestamp("maintenance_until").toInstant());
            item.put("createdAt", rs.getTimestamp("created_at").toInstant());
            return item;
        });
    }

    @Transactional
    public void revoke(UUID id) {
        revoke(id, null, API_ACTOR);
    }

    /** Final: the key can never be activated again. */
    @Transactional
    public void revoke(UUID id, String reason, String actor) {
        int changed = jdbc.update("UPDATE license_record SET status='REVOKED' WHERE id=? AND status='ACTIVE'", id);
        if (changed == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Active license not found");
        logEvent(id, null, "LICENSE_REVOKED", reason == null ? Map.of() : Map.of("reason", reason), actor);
    }

    /** Reversible: activations and lease refreshes are refused until the licence is resumed. */
    @Transactional
    public void suspend(UUID id, String reason, String actor) {
        if (reason == null || reason.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A reason is required");
        int changed = jdbc.update("UPDATE license_record SET suspended_at=now(), suspension_reason=? "
                + "WHERE id=? AND status='ACTIVE' AND suspended_at IS NULL", reason.trim(), id);
        if (changed == 0) throw new ResponseStatusException(HttpStatus.CONFLICT, "Only an active, non-suspended licence can be suspended");
        logEvent(id, null, "LICENSE_SUSPENDED", Map.of("reason", reason.trim()), actor);
    }

    @Transactional
    public void resume(UUID id, String actor) {
        int changed = jdbc.update("UPDATE license_record SET suspended_at=NULL, suspension_reason=NULL "
                + "WHERE id=? AND status='ACTIVE' AND suspended_at IS NOT NULL", id);
        if (changed == 0) throw new ResponseStatusException(HttpStatus.CONFLICT, "The licence is not suspended");
        logEvent(id, null, "LICENSE_RESUMED", Map.of(), actor);
    }

    /** Seats can change during the contract (upsell); the next lease refresh carries the new values. */
    @Transactional
    public void changeSeats(UUID id, int seatsFull, int seatsLight, String actor) {
        if (seatsFull < 0 || seatsLight < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seats cannot be negative");
        int changed = jdbc.update("UPDATE license_record SET seats_full=?, seats_light=? WHERE id=? AND status='ACTIVE'",
                seatsFull, seatsLight, id);
        if (changed == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Active license not found");
        logEvent(id, null, "SEATS_CHANGED", Map.of("seatsFull", seatsFull, "seatsLight", seatsLight), actor);
    }

    @Transactional
    public void changeEntitlements(UUID id, Set<String> entitlements, String planCode, String actor) {
        String encoded;
        try {
            encoded = mapper.writeValueAsString(new TreeSet<>(entitlements));
        } catch (Exception e) {
            throw new IllegalStateException("Could not encode license entitlements", e);
        }
        int changed = jdbc.update("UPDATE license_record SET entitlements=?, plan_code=COALESCE(?, plan_code), catalog_version=? "
                + "WHERE id=? AND status='ACTIVE'", encoded, planCode, EntitlementCatalog.CATALOG_VERSION, id);
        if (changed == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Active license not found");
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("entitlements", new TreeSet<>(entitlements));
        if (planCode != null) details.put("plan", planCode);
        logEvent(id, null, "ENTITLEMENTS_CHANGED", details, actor);
    }

    @Transactional
    public Map<String, Object> renew(UUID id, LicenseRenewRequest request) {
        return renew(id, request, API_ACTOR);
    }

    @Transactional
    public Map<String, Object> renew(UUID id, LicenseRenewRequest request, String actor) {
        var records = jdbc.query("""
                SELECT license_type, status, starts_at, expires_at, maintenance_until
                FROM license_record WHERE id=? FOR UPDATE
                """, (rs, row) -> new RenewalRow(rs.getString("license_type"), rs.getString("status"),
                rs.getTimestamp("starts_at").toInstant(),
                rs.getTimestamp("expires_at") == null ? null : rs.getTimestamp("expires_at").toInstant(),
                rs.getTimestamp("maintenance_until") == null ? null : rs.getTimestamp("maintenance_until").toInstant()), id);
        if (records.isEmpty() || !"ACTIVE".equals(records.get(0).status))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Active license not found");
        RenewalRow license = records.get(0);
        Instant expiry = request.expiresAt() == null ? license.expiresAt : request.expiresAt();
        Instant maintenance = request.maintenanceUntil() == null ? license.maintenanceUntil : request.maintenanceUntil();
        Instant now = Instant.now();
        if ("SUBSCRIPTION".equals(license.licenseType) &&
                (expiry == null || !expiry.isAfter(now) || !expiry.isAfter(license.startsAt)))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Subscription renewal requires a future expiresAt");
        if ("PERPETUAL".equals(license.licenseType) && expiry != null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Perpetual licenses cannot have an expiry");
        if (request.maintenanceUntil() != null && !request.maintenanceUntil().isAfter(now))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "maintenanceUntil must be in the future");

        jdbc.update("UPDATE license_record SET expires_at=?, maintenance_until=? WHERE id=? AND status='ACTIVE'",
                timestamp(expiry), timestamp(maintenance), id);
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("expiresAt", expiry);
        details.put("maintenanceUntil", maintenance);
        logEvent(id, null, "LICENSE_RENEWED", details, actor);
        return Map.of("id", id, "status", "ACTIVE", "expiresAt", expiry == null ? "" : expiry,
                "maintenanceUntil", maintenance == null ? "" : maintenance);
    }

    @Transactional
    public void deactivate(UUID activationId) {
        deactivate(activationId, API_ACTOR);
    }

    @Transactional
    public void deactivate(UUID activationId, String actor) {
        UUID licenseId = jdbc.query("SELECT license_id FROM license_activation WHERE id=? AND deactivated_at IS NULL",
                rs -> rs.next() ? rs.getObject(1, UUID.class) : null, activationId);
        if (licenseId == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Active installation not found");
        int changed = jdbc.update("UPDATE license_activation SET deactivated_at=now() WHERE id=? AND deactivated_at IS NULL", activationId);
        if (changed == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Active installation not found");
        logEvent(licenseId, activationId, "INSTALLATION_DEACTIVATED", Map.of(), actor);
    }

    @Transactional
    public String activate(String licenseKey, String fingerprint, String environment) {
        if (licenseKey == null || licenseKey.isBlank() || fingerprint == null ||
                !fingerprint.matches("[a-fA-F0-9]{64}") ||
                !Set.of("PRODUCTION", "PREPRODUCTION").contains(environment)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid activation request");
        }
        var licenses = jdbc.query("""
                SELECT * FROM license_record WHERE key_hash=? FOR UPDATE
                """, (rs, row) -> new LicenseRow(
                rs.getObject("id", UUID.class), rs.getString("customer_name"), rs.getString("edition"),
                rs.getString("license_type"), rs.getString("status"), rs.getInt("seats_full"),
                rs.getInt("seats_light"), rs.getString("entitlements"),
                rs.getTimestamp("starts_at").toInstant(),
                rs.getTimestamp("expires_at") == null ? null : rs.getTimestamp("expires_at").toInstant(),
                rs.getTimestamp("maintenance_until") == null ? null : rs.getTimestamp("maintenance_until").toInstant(),
                rs.getTimestamp("suspended_at") != null, rs.getInt("catalog_version")
        ), sha256(licenseKey));
        if (licenses.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "License key not recognized");
        LicenseRow license = licenses.get(0);
        Instant now = Instant.now();
        if (!"ACTIVE".equals(license.status) || license.suspended || now.isBefore(license.startsAt) ||
                (license.expiresAt != null && !now.isBefore(license.expiresAt))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "License is not active");
        }

        var existing = jdbc.query("""
                SELECT id, environment, deactivated_at FROM license_activation
                WHERE license_id=? AND fingerprint=? FOR UPDATE
                """, (rs, row) -> new ActivationRow(rs.getObject("id", UUID.class), rs.getString("environment"),
                        rs.getTimestamp("deactivated_at") == null ? null : rs.getTimestamp("deactivated_at").toInstant()),
                license.id, fingerprint.toLowerCase(Locale.ROOT));
        UUID activationId;
        if (!existing.isEmpty()) {
            ActivationRow activation = existing.get(0);
            if (!activation.environment.equals(environment)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Installation is already activated for another environment");
            }
            activationId = activation.id;
            if (activation.deactivatedAt != null) {
                requireAvailableSlot(license.id, environment);
                jdbc.update("UPDATE license_activation SET deactivated_at=NULL, activated_at=now() WHERE id=?", activationId);
            }
        } else {
            requireAvailableSlot(license.id, environment);
            activationId = UUID.randomUUID();
            jdbc.update("""
                    INSERT INTO license_activation(id, license_id, fingerprint, environment)
                    VALUES (?, ?, ?, ?)
                    """, activationId, license.id, fingerprint.toLowerCase(Locale.ROOT), environment);
        }
        Instant leaseUntil = now.plus(leaseDays, ChronoUnit.DAYS);
        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("iss", "QUOREICH GROUP License Authority");
        claims.put("sub", license.id.toString());
        claims.put("activationId", activationId.toString());
        claims.put("customer", license.customerName);
        claims.put("edition", license.edition);
        claims.put("licenseType", license.licenseType);
        claims.put("seatsFull", license.seatsFull);
        claims.put("seatsLight", license.seatsLight);
        claims.put("entitlements", readEntitlements(license.entitlements));
        // 1 = issued before the module catalogue: QPM keeps every module enabled for it.
        claims.put("catalogVersion", license.catalogVersion);
        claims.put("fingerprint", fingerprint.toLowerCase(Locale.ROOT));
        claims.put("environment", environment);
        claims.put("startsAt", license.startsAt.getEpochSecond());
        claims.put("licenseExpiresAt", license.expiresAt == null ? null : license.expiresAt.getEpochSecond());
        claims.put("maintenanceUntil", license.maintenanceUntil == null ? null : license.maintenanceUntil.getEpochSecond());
        claims.put("iat", now.getEpochSecond());
        claims.put("exp", leaseUntil.getEpochSecond());
        try {
            String lease = signer.sign(claims);
            logEvent(license.id, activationId, "LEASE_ISSUED", Map.of("environment", environment), "installation");
            return lease;
        } catch (Exception e) {
            throw new IllegalStateException("Could not sign activation lease", e);
        }
    }

    private void requireAvailableSlot(UUID licenseId, String environment) {
        boolean slotUsed = Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM license_activation
                WHERE license_id=? AND environment=? AND deactivated_at IS NULL)
                """, Boolean.class, licenseId, environment));
        if (slotUsed) throw new ResponseStatusException(HttpStatus.CONFLICT,
                "The license already has an active " + environment.toLowerCase(Locale.ROOT) + " installation");
    }

    private static Timestamp timestamp(Instant value) {
        return value == null ? null : Timestamp.from(value);
    }

    private List<String> readEntitlements(String json) {
        try {
            return mapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            throw new IllegalStateException("Stored license entitlement data is invalid", e);
        }
    }

    private void logEvent(UUID licenseId, UUID activationId, String eventType, Map<String, Object> details, String actor) {
        try {
            jdbc.update("""
                    INSERT INTO license_event(license_id, activation_id, event_type, details, actor)
                    VALUES (?, ?, ?, ?, ?)
                    """, licenseId, activationId, eventType, mapper.writeValueAsString(details), actor);
        } catch (Exception e) {
            throw new IllegalStateException("Could not record license audit event", e);
        }
    }

    private static String createLicenseKey() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return "QPM-" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private record LicenseRow(UUID id, String customerName, String edition, String licenseType, String status,
                              int seatsFull, int seatsLight, String entitlements, Instant startsAt,
                              Instant expiresAt, Instant maintenanceUntil, boolean suspended, int catalogVersion) {}
    private record ActivationRow(UUID id, String environment, Instant deactivatedAt) {}
    private record RenewalRow(String licenseType, String status, Instant startsAt, Instant expiresAt,
                              Instant maintenanceUntil) {}
}
