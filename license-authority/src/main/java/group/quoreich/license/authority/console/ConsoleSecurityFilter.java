package group.quoreich.license.authority.console;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Set;

/**
 * Protects the licence console:
 * <ul>
 *   <li>security headers on every response (strict CSP, no framing, no sniffing, no referrer);</li>
 *   <li>/console-api/** needs a full session cookie, except the sign-in steps;</li>
 *   <li>state-changing requests must carry {@code X-QPM-Console: 1}: a cross-site page cannot add it without a
 *       CORS preflight, which this service never allows (CSRF protection on top of SameSite=Strict).</li>
 * </ul>
 */
@Component
@Order(1)
public class ConsoleSecurityFilter extends OncePerRequestFilter {
    public static final String COOKIE = "qpm_console";
    public static final String ACCOUNT_ATTRIBUTE = "qpm.console.account";
    public static final String CSRF_HEADER = "X-QPM-Console";
    private static final Set<String> PARTIAL_PATHS = Set.of(
            "/console-api/auth/login", "/console-api/auth/totp", "/console-api/auth/enroll",
            "/console-api/auth/logout", "/console-api/auth/state");

    private final ConsoleAccountService accounts;

    public ConsoleSecurityFilter(ConsoleAccountService accounts) {
        this.accounts = accounts;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        response.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self'; "
                + "script-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; "
                + "form-action 'self'; frame-ancestors 'none'");
        response.setHeader("X-Frame-Options", "DENY");
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("Referrer-Policy", "no-referrer");
        response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

        String path = request.getRequestURI();
        if (!path.startsWith("/console-api/")) {
            chain.doFilter(request, response);
            return;
        }
        response.setHeader("Cache-Control", "no-store");
        boolean safeMethod = "GET".equals(request.getMethod()) || "HEAD".equals(request.getMethod());
        if (!safeMethod && !"1".equals(request.getHeader(CSRF_HEADER))) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Missing console header");
            return;
        }
        if (PARTIAL_PATHS.contains(path)) {
            chain.doFilter(request, response);
            return;
        }
        var session = accounts.fullSession(tokenOf(request), Instant.now());
        if (session.isEmpty()) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Sign in required");
            return;
        }
        request.setAttribute(ACCOUNT_ATTRIBUTE, session.get().account());
        chain.doFilter(request, response);
    }

    public static String tokenOf(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        for (Cookie cookie : request.getCookies()) if (COOKIE.equals(cookie.getName())) return cookie.getValue();
        return null;
    }
}
