package group.quoreich.license.authority;

import group.quoreich.license.authority.console.ConsoleAccountService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Creates console accounts with the operator admin token (AdminTokenFilter protects /admin/**). Used once to
 * create the first administrator; afterwards administrators manage accounts from the console.
 */
@RestController
@RequestMapping("/admin/console-users")
public class ConsoleBootstrapController {
    private final ConsoleAccountService accounts;

    public ConsoleBootstrapController(ConsoleAccountService accounts) {
        this.accounts = accounts;
    }

    public record CreateAccount(String email, String displayName, String role, String password) {}

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> create(@RequestBody CreateAccount body) {
        var account = accounts.create(body.email(), body.displayName(), body.role() == null ? "ADMIN" : body.role(),
                body.password());
        return Map.of("id", account.id(), "email", account.email(), "role", account.role(),
                "nextStep", "Sign in to the console and enrol an authenticator app.");
    }
}
