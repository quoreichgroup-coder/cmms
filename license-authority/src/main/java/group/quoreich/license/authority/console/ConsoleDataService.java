package group.quoreich.license.authority.console;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import group.quoreich.license.authority.EntitlementCatalog;
import group.quoreich.license.authority.LicenseAuthorityService;
import group.quoreich.license.authority.LicenseIssueRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.*;

/** Customers, licences as the sales team sees them, and the dashboard. */
@Service
public class ConsoleDataService {
    public static final Duration EXPIRING_SOON = Duration.ofDays(60);
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Africa/Ouagadougou");

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final LicenseAuthorityService licenses;
    private final PlanCatalogService plans;

    public ConsoleDataService(JdbcTemplate jdbc, ObjectMapper mapper, LicenseAuthorityService licenses,
                              PlanCatalogService plans) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.licenses = licenses;
        this.plans = plans;
    }

    public record CustomerInput(String name, String legalName, String country, String city, String contactName,
                                String contactEmail, String contactPhone, String notes) {}

    /** Seats/entitlements null = the plan's values; changing entitlements is reserved to administrators. */
    public record IssueInput(UUID customerId, String planCode, Instant startsAt, Integer durationMonths,
                             Instant expiresAt, Integer seatsFull, Integer seatsLight, Set<String> entitlements) {}

    // ------------------------------------------------------------------ customers

    public List<Map<String, Object>> customers(String query) {
        String term = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        return jdbc.query("""
                SELECT c.*,
                       (SELECT count(*) FROM license_record l WHERE l.customer_id=c.id AND l.status='ACTIVE') AS active_licenses,
                       (SELECT min(l.expires_at) FROM license_record l WHERE l.customer_id=c.id AND l.status='ACTIVE'
                          AND l.expires_at > now()) AS next_expiry
                FROM customer c
                WHERE ? = '' OR lower(c.name) LIKE ? OR lower(coalesce(c.legal_name,'')) LIKE ?
                   OR lower(coalesce(c.contact_email,'')) LIKE ? OR lower(coalesce(c.city,'')) LIKE ?
                ORDER BY lower(c.name)""", (rs, row) -> {
            Map<String, Object> customer = customer(rs);
            customer.put("activeLicenses", rs.getInt("active_licenses"));
            customer.put("nextExpiry", instant(rs, "next_expiry"));
            return customer;
        }, term, "%" + term + "%", "%" + term + "%", "%" + term + "%", "%" + term + "%");
    }

    public Map<String, Object> customer(UUID id) {
        Map<String, Object> customer = jdbc.query("SELECT * FROM customer WHERE id=?", (rs, row) -> customer(rs), id)
                .stream().findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));
        customer.put("licenses", licenseList(null, id));
        return customer;
    }

    @Transactional
    public Map<String, Object> saveCustomer(UUID id, CustomerInput input, String actor) {
        if (input.name() == null || input.name().isBlank() || input.name().length() > 240) throw bad("A customer name is required");
        if (input.contactEmail() != null && !input.contactEmail().isBlank()
                && !input.contactEmail().trim().matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+")) throw bad("Invalid contact e-mail");
        Boolean duplicate = jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM customer WHERE lower(name)=lower(?) AND id IS DISTINCT FROM ?)",
                Boolean.class, input.name().trim(), id);
        if (Boolean.TRUE.equals(duplicate)) throw new ResponseStatusException(HttpStatus.CONFLICT, "A customer with this name already exists");
        UUID customerId = id == null ? UUID.randomUUID() : id;
        if (id == null) {
            jdbc.update("""
                    INSERT INTO customer(id, name, legal_name, country, city, contact_name, contact_email, contact_phone,
                                         notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    customerId, input.name().trim(), blank(input.legalName()), blank(input.country()), blank(input.city()),
                    blank(input.contactName()), blank(input.contactEmail()), blank(input.contactPhone()), blank(input.notes()), actor);
        } else if (jdbc.update("""
                UPDATE customer SET name=?, legal_name=?, country=?, city=?, contact_name=?, contact_email=?,
                       contact_phone=?, notes=?, updated_at=now() WHERE id=?""",
                input.name().trim(), blank(input.legalName()), blank(input.country()), blank(input.city()),
                blank(input.contactName()), blank(input.contactEmail()), blank(input.contactPhone()), blank(input.notes()), id) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found");
        }
        // Licences keep the customer name signed into their leases in sync with the record.
        jdbc.update("UPDATE license_record SET customer_name=? WHERE customer_id=?", input.name().trim(), customerId);
        return customer(customerId);
    }

    // ------------------------------------------------------------------ licences

    public List<Map<String, Object>> licenseList(String state, UUID customerId) {
        List<Map<String, Object>> rows = jdbc.query("""
                SELECT l.*, c.name AS customer_record_name, p.name AS plan_name,
                       (SELECT count(*) FROM license_activation a WHERE a.license_id=l.id AND a.deactivated_at IS NULL) AS installations
                FROM license_record l
                LEFT JOIN customer c ON c.id = l.customer_id
                LEFT JOIN license_plan p ON p.code = l.plan_code
                WHERE (?::uuid IS NULL OR l.customer_id = ?::uuid)
                ORDER BY l.expires_at NULLS LAST, l.created_at DESC""", (rs, row) -> license(rs), customerId, customerId);
        if (state == null || state.isBlank()) return rows;
        return rows.stream().filter(row -> state.equals(row.get("state"))).toList();
    }

    public Map<String, Object> licenseDetail(UUID id) {
        Map<String, Object> license = jdbc.query("""
                SELECT l.*, c.name AS customer_record_name, p.name AS plan_name,
                       (SELECT count(*) FROM license_activation a WHERE a.license_id=l.id AND a.deactivated_at IS NULL) AS installations
                FROM license_record l LEFT JOIN customer c ON c.id = l.customer_id
                LEFT JOIN license_plan p ON p.code = l.plan_code WHERE l.id=?""", (rs, row) -> license(rs), id)
                .stream().findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Licence not found"));
        license.put("installationsList", jdbc.query("""
                SELECT id, environment, fingerprint, activated_at, deactivated_at FROM license_activation
                WHERE license_id=? ORDER BY activated_at DESC""", (rs, row) -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", rs.getObject("id", UUID.class));
            item.put("environment", rs.getString("environment"));
            item.put("fingerprint", rs.getString("fingerprint").substring(0, 12) + "…");
            item.put("activatedAt", instant(rs, "activated_at"));
            item.put("deactivatedAt", instant(rs, "deactivated_at"));
            return item;
        }, id));
        license.put("events", jdbc.query("""
                SELECT event_type, details, actor, created_at FROM license_event
                WHERE license_id=? AND event_type <> 'LEASE_ISSUED' ORDER BY created_at DESC LIMIT 200""", (rs, row) -> {
            Map<String, Object> event = new LinkedHashMap<>();
            event.put("type", rs.getString("event_type"));
            event.put("details", readMap(rs.getString("details")));
            event.put("actor", rs.getString("actor"));
            event.put("at", instant(rs, "created_at"));
            return event;
        }, id));
        // max() is NULL for a licence never activated: read it as a nullable value.
        java.sql.Timestamp lastLease = jdbc.queryForObject(
                "SELECT max(created_at) FROM license_event WHERE license_id=? AND event_type='LEASE_ISSUED'",
                java.sql.Timestamp.class, id);
        license.put("lastLeaseAt", lastLease == null ? null : lastLease.toInstant());
        return license;
    }

    @Transactional
    public Map<String, Object> issue(IssueInput input, ConsoleAccountService.Account actor) {
        if (input.customerId() == null) throw bad("Choose a customer");
        Map<String, Object> customer = jdbc.query("SELECT * FROM customer WHERE id=?", (rs, row) -> customer(rs), input.customerId())
                .stream().findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));
        PlanCatalogService.Plan plan = plans.get(input.planCode());
        if (!plan.active()) throw bad("This plan is no longer sold");
        Set<String> entitlements = plan.entitlements();
        if (input.entitlements() != null && !new TreeSet<>(input.entitlements()).equals(new TreeSet<>(plan.entitlements()))) {
            if (!actor.isAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only an administrator can change the entitlements of a plan");
            entitlements = PlanCatalogService.requireKnown(input.entitlements());
        }
        int seatsFull = input.seatsFull() == null ? plan.seatsFull() : input.seatsFull();
        int seatsLight = input.seatsLight() == null ? plan.seatsLight() : input.seatsLight();
        Instant startsAt = input.startsAt() == null ? Instant.now() : input.startsAt();
        Instant expiresAt = null;
        if ("SUBSCRIPTION".equals(plan.licenseType())) {
            int months = input.durationMonths() != null ? input.durationMonths()
                    : plan.durationMonths() == null ? 12 : plan.durationMonths();
            if (input.expiresAt() != null) expiresAt = input.expiresAt();
            else if (months < 1 || months > 120) throw bad("Duration must be between 1 and 120 months");
            else expiresAt = ZonedDateTime.ofInstant(startsAt, BUSINESS_ZONE).plusMonths(months).toInstant();
        }
        LicenseIssueRequest request = new LicenseIssueRequest((String) customer.get("name"), plan.name(),
                plan.licenseType(), seatsFull, seatsLight, entitlements, startsAt, expiresAt, expiresAt);
        return licenses.issue(request, input.customerId(), plan.code(), EntitlementCatalog.CATALOG_VERSION, actor.email());
    }

    // ------------------------------------------------------------------ dashboard

    public Map<String, Object> dashboard() {
        List<Map<String, Object>> all = licenseList(null, null);
        Map<String, Long> byState = new LinkedHashMap<>();
        for (String state : List.of("ACTIVE", "EXPIRING", "EXPIRED", "SUSPENDED", "REVOKED")) byState.put(state, 0L);
        long seatsFull = 0, seatsLight = 0;
        for (Map<String, Object> license : all) {
            byState.merge((String) license.get("state"), 1L, Long::sum);
            if (List.of("ACTIVE", "EXPIRING").contains(license.get("state"))) {
                seatsFull += ((Number) license.get("seatsFull")).longValue();
                seatsLight += ((Number) license.get("seatsLight")).longValue();
            }
        }
        Map<String, Object> dashboard = new LinkedHashMap<>();
        dashboard.put("byState", byState);
        dashboard.put("customers", jdbc.queryForObject("SELECT count(*) FROM customer", Long.class));
        dashboard.put("seatsFull", seatsFull);
        dashboard.put("seatsLight", seatsLight);
        dashboard.put("renewals", all.stream().filter(license -> "EXPIRING".equals(license.get("state"))
                || "EXPIRED".equals(license.get("state"))).limit(20).toList());
        dashboard.put("withoutInstallation", all.stream().filter(license -> List.of("ACTIVE", "EXPIRING").contains(license.get("state"))
                && ((Number) license.get("installations")).intValue() == 0).limit(20).toList());
        return dashboard;
    }

    // ------------------------------------------------------------------ mapping

    /** ACTIVE, EXPIRING (within 60 days), EXPIRED, SUSPENDED or REVOKED: what the sales team acts on. */
    static String state(String status, Instant suspendedAt, Instant expiresAt, Instant now) {
        if ("REVOKED".equals(status)) return "REVOKED";
        if (suspendedAt != null) return "SUSPENDED";
        if (expiresAt != null && !expiresAt.isAfter(now)) return "EXPIRED";
        if (expiresAt != null && expiresAt.isBefore(now.plus(EXPIRING_SOON))) return "EXPIRING";
        return "ACTIVE";
    }

    private Map<String, Object> license(ResultSet rs) throws SQLException {
        Map<String, Object> item = new LinkedHashMap<>();
        Instant expiresAt = instant(rs, "expires_at");
        Instant suspendedAt = instant(rs, "suspended_at");
        item.put("id", rs.getObject("id", UUID.class));
        item.put("keyHint", rs.getString("key_hint"));
        item.put("customerId", rs.getObject("customer_id", UUID.class));
        item.put("customerName", rs.getString("customer_record_name") != null
                ? rs.getString("customer_record_name") : rs.getString("customer_name"));
        item.put("planCode", rs.getString("plan_code"));
        item.put("planName", rs.getString("plan_name") != null ? rs.getString("plan_name") : rs.getString("edition"));
        item.put("licenseType", rs.getString("license_type"));
        item.put("status", rs.getString("status"));
        item.put("state", state(rs.getString("status"), suspendedAt, expiresAt, Instant.now()));
        item.put("suspensionReason", rs.getString("suspension_reason"));
        item.put("seatsFull", rs.getInt("seats_full"));
        item.put("seatsLight", rs.getInt("seats_light"));
        item.put("entitlements", readList(rs.getString("entitlements")));
        item.put("catalogVersion", rs.getInt("catalog_version"));
        item.put("startsAt", instant(rs, "starts_at"));
        item.put("expiresAt", expiresAt);
        item.put("maintenanceUntil", instant(rs, "maintenance_until"));
        item.put("createdAt", instant(rs, "created_at"));
        item.put("installations", rs.getInt("installations"));
        return item;
    }

    private static Map<String, Object> customer(ResultSet rs) throws SQLException {
        Map<String, Object> customer = new LinkedHashMap<>();
        customer.put("id", rs.getObject("id", UUID.class));
        for (String[] column : new String[][]{{"name", "name"}, {"legalName", "legal_name"}, {"country", "country"},
                {"city", "city"}, {"contactName", "contact_name"}, {"contactEmail", "contact_email"},
                {"contactPhone", "contact_phone"}, {"notes", "notes"}, {"createdBy", "created_by"}})
            customer.put(column[0], rs.getString(column[1]));
        customer.put("createdAt", instant(rs, "created_at"));
        return customer;
    }

    private List<String> readList(String json) {
        try {
            return mapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            throw new IllegalStateException("Stored entitlements are invalid", e);
        }
    }

    private Map<String, Object> readMap(String json) {
        try {
            return mapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return Map.of();
        }
    }

    private static Instant instant(ResultSet rs, String column) throws SQLException {
        return rs.getTimestamp(column) == null ? null : rs.getTimestamp(column).toInstant();
    }

    private static String blank(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
