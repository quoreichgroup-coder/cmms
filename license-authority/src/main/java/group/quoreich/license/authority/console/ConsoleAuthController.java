package group.quoreich.license.authority.console;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/console-api/auth")
public class ConsoleAuthController {
    private final ConsoleAccountService accounts;
    private final boolean secureCookie;

    public ConsoleAuthController(ConsoleAccountService accounts,
                                 @Value("${license-authority.console.secure-cookie:true}") boolean secureCookie) {
        this.accounts = accounts;
        this.secureCookie = secureCookie;
    }

    public record LoginRequest(String email, String password) {}
    public record CodeRequest(String code) {}
    public record PasswordChange(String currentPassword, String newPassword) {}

    @PostMapping("/login")
    public Map<String, String> login(@RequestBody LoginRequest body, HttpServletResponse response) {
        var result = accounts.login(body.email(), body.password(), Instant.now());
        setCookie(response, result.token());
        return Map.of("nextStep", result.nextStep());
    }

    /** Where the browser is in the sign-in flow, so a reload resumes at the right step. */
    @GetMapping("/state")
    public Map<String, Object> state(HttpServletRequest request) {
        String token = ConsoleSecurityFilter.tokenOf(request);
        var full = accounts.fullSession(token, Instant.now());
        if (full.isPresent()) return Map.of("stage", "SIGNED_IN", "account", view(full.get().account()));
        try {
            var partial = accounts.partialSession(token, Instant.now());
            return Map.of("stage", partial.account().totpEnabled() ? "TOTP" : "ENROLL");
        } catch (ResponseStatusException signedOut) {
            return Map.of("stage", "SIGNED_OUT");
        }
    }

    @PostMapping("/totp")
    public Map<String, Object> totp(@RequestBody CodeRequest body, HttpServletRequest request, HttpServletResponse response) {
        setCookie(response, accounts.verifySecondFactor(ConsoleSecurityFilter.tokenOf(request), body.code(), Instant.now()));
        return Map.of("stage", "SIGNED_IN");
    }

    @GetMapping("/enroll")
    public Map<String, String> startEnrollment(HttpServletRequest request) {
        return accounts.startEnrollment(ConsoleSecurityFilter.tokenOf(request), Instant.now());
    }

    @PostMapping("/enroll")
    public Map<String, Object> confirmEnrollment(@RequestBody CodeRequest body, HttpServletRequest request,
                                                 HttpServletResponse response) {
        setCookie(response, accounts.confirmEnrollment(ConsoleSecurityFilter.tokenOf(request), body.code(), Instant.now()));
        return Map.of("stage", "SIGNED_IN");
    }

    @PostMapping("/logout")
    public Map<String, Boolean> logout(HttpServletRequest request, HttpServletResponse response) {
        accounts.logout(ConsoleSecurityFilter.tokenOf(request));
        response.addHeader("Set-Cookie", cookie("", 0).toString());
        return Map.of("signedOut", true);
    }

    @PostMapping("/password")
    public Map<String, Boolean> changePassword(@RequestBody PasswordChange body, HttpServletRequest request) {
        var account = ConsoleControllerSupport.account(request);
        accounts.changeOwnPassword(account.id(), body.currentPassword(), body.newPassword());
        return Map.of("changed", true);
    }

    static Map<String, Object> view(ConsoleAccountService.Account account) {
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("id", account.id());
        view.put("email", account.email());
        view.put("displayName", account.displayName());
        view.put("role", account.role());
        view.put("totpEnabled", account.totpEnabled());
        view.put("active", account.active());
        view.put("lastLoginAt", account.lastLoginAt());
        view.put("locked", account.lockedUntil() != null && account.lockedUntil().isAfter(Instant.now()));
        return view;
    }

    private void setCookie(HttpServletResponse response, String token) {
        response.addHeader("Set-Cookie", cookie(token, ConsoleAccountService.SESSION_MAX.toSeconds()).toString());
    }

    private ResponseCookie cookie(String value, long maxAgeSeconds) {
        return ResponseCookie.from(ConsoleSecurityFilter.COOKIE, value)
                .httpOnly(true).secure(secureCookie).sameSite("Strict").path("/").maxAge(maxAgeSeconds).build();
    }
}
