package group.quoreich.license.authority.console;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/** Current account helpers and a JSON error format ({"message": ...}) for the console API. */
@RestControllerAdvice(basePackages = "group.quoreich.license.authority.console")
public class ConsoleControllerSupport {

    public static ConsoleAccountService.Account account(HttpServletRequest request) {
        Object value = request.getAttribute(ConsoleSecurityFilter.ACCOUNT_ATTRIBUTE);
        if (!(value instanceof ConsoleAccountService.Account account))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in required");
        return account;
    }

    public static ConsoleAccountService.Account admin(HttpServletRequest request) {
        ConsoleAccountService.Account account = account(request);
        if (!account.isAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Administrator access required");
        return account;
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> error(ResponseStatusException error) {
        return ResponseEntity.status(error.getStatusCode())
                .body(Map.of("message", error.getReason() == null ? "Error" : error.getReason()));
    }
}
