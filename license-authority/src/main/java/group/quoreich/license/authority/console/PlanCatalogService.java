package group.quoreich.license.authority.console;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import group.quoreich.license.authority.EntitlementCatalog;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

/** Plans sold by QUOREICH GROUP (default entitlements and seats). Seeded once; edited by administrators. */
@Service
public class PlanCatalogService implements ApplicationRunner {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public PlanCatalogService(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    public record Plan(String code, String name, String description, String licenseType, Integer durationMonths,
                       int seatsFull, int seatsLight, Set<String> entitlements, boolean active, int sortOrder) {}

    @Override
    public void run(ApplicationArguments args) {
        for (EntitlementCatalog.PlanSeed seed : EntitlementCatalog.DEFAULT_PLANS) {
            jdbc.update("""
                    INSERT INTO license_plan(code, name, description, license_type, duration_months, seats_full,
                                             seats_light, entitlements, sort_order, updated_by)
                    VALUES (?, ?, ?, 'SUBSCRIPTION', 12, ?, ?, ?, ?, 'system')
                    ON CONFLICT (code) DO NOTHING
                    """, seed.code(), seed.name(), seed.description(), seed.seatsFull(), seed.seatsLight(),
                    encode(seed.entitlements()), seed.sortOrder());
        }
    }

    public List<Plan> list(boolean activeOnly) {
        return jdbc.query("SELECT * FROM license_plan " + (activeOnly ? "WHERE active " : "")
                + "ORDER BY sort_order, name", (rs, row) -> new Plan(rs.getString("code"), rs.getString("name"),
                rs.getString("description"), rs.getString("license_type"),
                rs.getObject("duration_months") == null ? null : rs.getInt("duration_months"),
                rs.getInt("seats_full"), rs.getInt("seats_light"), decode(rs.getString("entitlements")),
                rs.getBoolean("active"), rs.getInt("sort_order")));
    }

    public Plan get(String code) {
        return list(false).stream().filter(plan -> plan.code().equals(code)).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Plan not found"));
    }

    @Transactional
    public Plan save(Plan plan, boolean create, String actor) {
        if (plan.code() == null || !plan.code().matches("[A-Z][A-Z0-9_]{1,39}"))
            throw bad("Code: capital letters, digits and _ (2 to 40 characters)");
        if (plan.name() == null || plan.name().isBlank() || plan.name().length() > 120) throw bad("A plan name is required");
        if (!Set.of("SUBSCRIPTION", "PERPETUAL").contains(plan.licenseType())) throw bad("Invalid licence type");
        if ("SUBSCRIPTION".equals(plan.licenseType()) && (plan.durationMonths() == null
                || plan.durationMonths() < 1 || plan.durationMonths() > 120))
            throw bad("A subscription plan needs a duration of 1 to 120 months");
        if (plan.seatsFull() < 0 || plan.seatsLight() < 0) throw bad("Seats cannot be negative");
        Set<String> entitlements = requireKnown(plan.entitlements());
        Integer duration = "PERPETUAL".equals(plan.licenseType()) ? null : plan.durationMonths();
        if (create) {
            Boolean exists = jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM license_plan WHERE code=?)", Boolean.class, plan.code());
            if (Boolean.TRUE.equals(exists)) throw new ResponseStatusException(HttpStatus.CONFLICT, "This plan code already exists");
            jdbc.update("""
                    INSERT INTO license_plan(code, name, description, license_type, duration_months, seats_full,
                                             seats_light, entitlements, active, sort_order, updated_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""", plan.code(), plan.name().trim(), plan.description(),
                    plan.licenseType(), duration, plan.seatsFull(), plan.seatsLight(), encode(entitlements),
                    plan.active(), plan.sortOrder(), actor);
        } else if (jdbc.update("""
                UPDATE license_plan SET name=?, description=?, license_type=?, duration_months=?, seats_full=?,
                       seats_light=?, entitlements=?, active=?, sort_order=?, updated_by=?, updated_at=now()
                WHERE code=?""", plan.name().trim(), plan.description(), plan.licenseType(), duration, plan.seatsFull(),
                plan.seatsLight(), encode(entitlements), plan.active(), plan.sortOrder(), actor, plan.code()) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Plan not found");
        }
        return get(plan.code());
    }

    /** Only codes from the catalogue: a typo would silently remove a feature from the customer. */
    public static Set<String> requireKnown(Collection<String> entitlements) {
        if (entitlements == null) throw bad("Entitlements are required");
        Set<String> unknown = new TreeSet<>(entitlements);
        unknown.removeAll(EntitlementCatalog.ALL_CODES);
        if (!unknown.isEmpty()) throw bad("Unknown entitlements: " + String.join(", ", unknown));
        return new TreeSet<>(entitlements);
    }

    private String encode(Set<String> entitlements) {
        try {
            return mapper.writeValueAsString(new TreeSet<>(entitlements));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    Set<String> decode(String json) {
        try {
            return new TreeSet<>(mapper.readValue(json, new TypeReference<List<String>>() {}));
        } catch (Exception e) {
            throw new IllegalStateException("Stored plan entitlements are invalid", e);
        }
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
