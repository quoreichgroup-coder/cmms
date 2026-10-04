package group.quoreich.license.authority;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/admin/licenses")
public class LicenseAdminController {
    private final LicenseAuthorityService service;
    private final JdbcTemplate jdbc;

    public LicenseAdminController(LicenseAuthorityService service, JdbcTemplate jdbc) {
        this.service = service;
        this.jdbc = jdbc;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> issue(@Valid @RequestBody LicenseIssueRequest request) {
        return service.issue(request);
    }

    @GetMapping
    public List<Map<String, Object>> list() {
        return service.list();
    }

    @PostMapping("/{id}/revoke")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revoke(@PathVariable UUID id) {
        service.revoke(id);
    }

    @GetMapping("/{id}/activations")
    public List<Map<String, Object>> activations(@PathVariable UUID id) {
        return jdbc.query("""
                SELECT id, fingerprint, environment, activated_at, deactivated_at
                FROM license_activation WHERE license_id=? ORDER BY activated_at DESC
                """, (rs, row) -> Map.of(
                "id", rs.getObject("id", UUID.class),
                "fingerprint", rs.getString("fingerprint"),
                "environment", rs.getString("environment"),
                "activatedAt", rs.getTimestamp("activated_at").toInstant(),
                "active", rs.getTimestamp("deactivated_at") == null
        ), id);
    }

    @PostMapping("/activations/{activationId}/deactivate")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivate(@PathVariable UUID activationId) {
        service.deactivate(activationId);
    }

    @GetMapping("/{id}/events")
    public List<Map<String, Object>> events(@PathVariable UUID id) {
        return jdbc.query("""
                SELECT event_type, activation_id, details, created_at
                FROM license_event WHERE license_id=? ORDER BY created_at DESC LIMIT 200
                """, (rs, row) -> Map.of(
                "type", rs.getString("event_type"),
                "activationId", rs.getObject("activation_id") == null ? "" : rs.getObject("activation_id").toString(),
                "details", rs.getString("details"),
                "createdAt", rs.getTimestamp("created_at").toInstant()
        ), id);
    }
}
