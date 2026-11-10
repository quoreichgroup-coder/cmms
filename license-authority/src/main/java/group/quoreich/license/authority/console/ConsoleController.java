package group.quoreich.license.authority.console;

import group.quoreich.license.authority.EntitlementCatalog;
import group.quoreich.license.authority.LicenseAuthorityService;
import group.quoreich.license.authority.LicenseRenewRequest;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.*;

/**
 * Licence console API. Sales: customers, issue from a plan, renew, seats. Administrators additionally:
 * entitlements outside the plan, suspend/resume/revoke, installations, plans catalogue and accounts.
 * Every change is recorded with the e-mail of the account that made it.
 */
@RestController
@RequestMapping("/console-api")
public class ConsoleController {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Africa/Ouagadougou");

    private final ConsoleDataService data;
    private final PlanCatalogService plans;
    private final ConsoleAccountService accounts;
    private final LicenseAuthorityService licenses;

    public ConsoleController(ConsoleDataService data, PlanCatalogService plans, ConsoleAccountService accounts,
                             LicenseAuthorityService licenses) {
        this.data = data;
        this.plans = plans;
        this.accounts = accounts;
        this.licenses = licenses;
    }

    public record RenewInput(Integer months, Instant expiresAt) {}
    public record SeatsInput(int seatsFull, int seatsLight) {}
    public record EntitlementsInput(String planCode, Set<String> entitlements) {}
    public record ReasonInput(String reason) {}
    public record AccountInput(String email, String displayName, String role, String password) {}
    public record AccountUpdate(String role, Boolean active) {}
    public record PasswordInput(String password) {}

    @GetMapping("/me")
    public Map<String, Object> me(HttpServletRequest request) {
        return ConsoleAuthController.view(ConsoleControllerSupport.account(request));
    }

    @GetMapping("/catalog")
    public Map<String, Object> catalog(HttpServletRequest request) {
        ConsoleControllerSupport.account(request);
        return Map.of("catalogVersion", EntitlementCatalog.CATALOG_VERSION, "modules", EntitlementCatalog.MODULES,
                "plans", plans.list(true));
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard(HttpServletRequest request) {
        ConsoleControllerSupport.account(request);
        return data.dashboard();
    }

    // ------------------------------------------------------------------ customers

    @GetMapping("/customers")
    public List<Map<String, Object>> customers(@RequestParam(defaultValue = "") String q, HttpServletRequest request) {
        ConsoleControllerSupport.account(request);
        return data.customers(q);
    }

    @GetMapping("/customers/{id}")
    public Map<String, Object> customer(@PathVariable UUID id, HttpServletRequest request) {
        ConsoleControllerSupport.account(request);
        return data.customer(id);
    }

    @PostMapping("/customers")
    public Map<String, Object> createCustomer(@RequestBody ConsoleDataService.CustomerInput body, HttpServletRequest request) {
        return data.saveCustomer(null, body, ConsoleControllerSupport.account(request).email());
    }

    @PutMapping("/customers/{id}")
    public Map<String, Object> updateCustomer(@PathVariable UUID id, @RequestBody ConsoleDataService.CustomerInput body,
                                              HttpServletRequest request) {
        return data.saveCustomer(id, body, ConsoleControllerSupport.account(request).email());
    }

    // ------------------------------------------------------------------ licences

    @GetMapping("/licenses")
    public List<Map<String, Object>> licenses(@RequestParam(required = false) String state, HttpServletRequest request) {
        ConsoleControllerSupport.account(request);
        return data.licenseList(state, null);
    }

    @GetMapping("/licenses/{id}")
    public Map<String, Object> license(@PathVariable UUID id, HttpServletRequest request) {
        ConsoleControllerSupport.account(request);
        return data.licenseDetail(id);
    }

    /** The key is returned once and never stored in clear. */
    @PostMapping("/licenses")
    public Map<String, Object> issue(@RequestBody ConsoleDataService.IssueInput body, HttpServletRequest request) {
        return data.issue(body, ConsoleControllerSupport.account(request));
    }

    /** Extends from the current expiry (or from today when already expired), in Ouagadougou time. */
    @PostMapping("/licenses/{id}/renew")
    public Map<String, Object> renew(@PathVariable UUID id, @RequestBody RenewInput body, HttpServletRequest request) {
        var actor = ConsoleControllerSupport.account(request);
        Map<String, Object> current = data.licenseDetail(id);
        if ("PERPETUAL".equals(current.get("licenseType"))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A perpetual licence does not expire");
        }
        Instant expiresAt = body.expiresAt();
        if (expiresAt == null) {
            if (body.months() == null || body.months() < 1 || body.months() > 60)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Renew for 1 to 60 months");
            Instant base = (Instant) current.get("expiresAt");
            if (base == null || base.isBefore(Instant.now())) base = Instant.now();
            expiresAt = ZonedDateTime.ofInstant(base, BUSINESS_ZONE).plusMonths(body.months()).toInstant();
        }
        licenses.renew(id, new LicenseRenewRequest(expiresAt, expiresAt), actor.email());
        return data.licenseDetail(id);
    }

    @PostMapping("/licenses/{id}/seats")
    public Map<String, Object> seats(@PathVariable UUID id, @RequestBody SeatsInput body, HttpServletRequest request) {
        licenses.changeSeats(id, body.seatsFull(), body.seatsLight(), ConsoleControllerSupport.account(request).email());
        return data.licenseDetail(id);
    }

    @PostMapping("/licenses/{id}/entitlements")
    public Map<String, Object> entitlements(@PathVariable UUID id, @RequestBody EntitlementsInput body,
                                            HttpServletRequest request) {
        var actor = ConsoleControllerSupport.admin(request);
        Set<String> entitlements = body.planCode() != null && body.entitlements() == null
                ? plans.get(body.planCode()).entitlements()
                : PlanCatalogService.requireKnown(body.entitlements());
        licenses.changeEntitlements(id, entitlements, body.planCode(), actor.email());
        return data.licenseDetail(id);
    }

    @PostMapping("/licenses/{id}/suspend")
    public Map<String, Object> suspend(@PathVariable UUID id, @RequestBody ReasonInput body, HttpServletRequest request) {
        licenses.suspend(id, body.reason(), ConsoleControllerSupport.admin(request).email());
        return data.licenseDetail(id);
    }

    @PostMapping("/licenses/{id}/resume")
    public Map<String, Object> resume(@PathVariable UUID id, HttpServletRequest request) {
        licenses.resume(id, ConsoleControllerSupport.admin(request).email());
        return data.licenseDetail(id);
    }

    @PostMapping("/licenses/{id}/revoke")
    public Map<String, Object> revoke(@PathVariable UUID id, @RequestBody ReasonInput body, HttpServletRequest request) {
        if (body.reason() == null || body.reason().isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A reason is required");
        licenses.revoke(id, body.reason().trim(), ConsoleControllerSupport.admin(request).email());
        return data.licenseDetail(id);
    }

    @PostMapping("/installations/{activationId}/deactivate")
    public Map<String, Boolean> deactivate(@PathVariable UUID activationId, HttpServletRequest request) {
        licenses.deactivate(activationId, ConsoleControllerSupport.admin(request).email());
        return Map.of("deactivated", true);
    }

    // ------------------------------------------------------------------ plans (administrators)

    @GetMapping("/plans")
    public List<PlanCatalogService.Plan> plans(HttpServletRequest request) {
        ConsoleControllerSupport.account(request);
        return plans.list(false);
    }

    @PostMapping("/plans")
    public PlanCatalogService.Plan createPlan(@RequestBody PlanCatalogService.Plan body, HttpServletRequest request) {
        return plans.save(body, true, ConsoleControllerSupport.admin(request).email());
    }

    @PutMapping("/plans/{code}")
    public PlanCatalogService.Plan updatePlan(@PathVariable String code, @RequestBody PlanCatalogService.Plan body,
                                              HttpServletRequest request) {
        if (!code.equals(body.code())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Plan code cannot change");
        return plans.save(body, false, ConsoleControllerSupport.admin(request).email());
    }

    // ------------------------------------------------------------------ accounts (administrators)

    @GetMapping("/users")
    public List<Map<String, Object>> users(HttpServletRequest request) {
        ConsoleControllerSupport.admin(request);
        return accounts.list().stream().map(ConsoleAuthController::view).toList();
    }

    @PostMapping("/users")
    public Map<String, Object> createUser(@RequestBody AccountInput body, HttpServletRequest request) {
        ConsoleControllerSupport.admin(request);
        return ConsoleAuthController.view(accounts.create(body.email(), body.displayName(), body.role(), body.password()));
    }

    @PatchMapping("/users/{id}")
    public Map<String, Object> updateUser(@PathVariable UUID id, @RequestBody AccountUpdate body, HttpServletRequest request) {
        var actor = ConsoleControllerSupport.admin(request);
        return ConsoleAuthController.view(accounts.update(id, body.role(), body.active(), actor.id()));
    }

    @PostMapping("/users/{id}/reset-second-factor")
    public Map<String, Boolean> resetSecondFactor(@PathVariable UUID id, HttpServletRequest request) {
        ConsoleControllerSupport.admin(request);
        accounts.resetSecondFactor(id);
        return Map.of("reset", true);
    }

    @PostMapping("/users/{id}/reset-password")
    public Map<String, Boolean> resetPassword(@PathVariable UUID id, @RequestBody PasswordInput body, HttpServletRequest request) {
        ConsoleControllerSupport.admin(request);
        accounts.resetPassword(id, body.password());
        return Map.of("reset", true);
    }
}
