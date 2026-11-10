package group.quoreich.license.authority.console;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

/**
 * Personal console accounts: password (BCrypt), mandatory TOTP second factor, lockout and server-side
 * sessions. Only the SHA-256 of a session token is stored. A session is "partial" after the password and
 * becomes "full" after the second factor (or after enrolling one on first login).
 */
@Service
public class ConsoleAccountService {
    public static final int MAX_FAILED_ATTEMPTS = 5;
    public static final Duration LOCK_DURATION = Duration.ofMinutes(15);
    public static final Duration SESSION_MAX = Duration.ofHours(8);
    public static final Duration SESSION_IDLE = Duration.ofMinutes(30);
    public static final int MIN_PASSWORD_LENGTH = 12;
    private static final String ISSUER = "QUOREICH Licences";
    private static final SecureRandom RANDOM = new SecureRandom();
    // A real hash so an unknown e-mail costs as much time as a wrong password.
    private static final String DUMMY_HASH = new BCryptPasswordEncoder(12).encode("qpm-console-dummy-password");

    private final JdbcTemplate jdbc;
    private final TotpService totp;
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder(12);

    public ConsoleAccountService(JdbcTemplate jdbc, TotpService totp) {
        this.jdbc = jdbc;
        this.totp = totp;
    }

    public record Account(UUID id, String email, String displayName, String role, boolean totpEnabled,
                          boolean active, Instant lastLoginAt, Instant lockedUntil) {
        public boolean isAdmin() { return "ADMIN".equals(role); }
    }

    public record Session(Account account, boolean secondFactorDone) {}

    public record LoginResult(String token, String nextStep) {}

    // ------------------------------------------------------------------ accounts

    @Transactional
    public Account create(String email, String displayName, String role, String password) {
        String normalized = normalizeEmail(email);
        if (displayName == null || displayName.isBlank() || displayName.length() > 160)
            throw bad("A display name is required");
        if (!Set.of("ADMIN", "SALES").contains(role)) throw bad("Role must be ADMIN or SALES");
        requireStrongPassword(password);
        Boolean exists = jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM console_user WHERE lower(email)=?)",
                Boolean.class, normalized);
        if (Boolean.TRUE.equals(exists)) throw new ResponseStatusException(HttpStatus.CONFLICT, "This e-mail already has an account");
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO console_user(id, email, display_name, role, password_hash) VALUES (?, ?, ?, ?, ?)",
                id, normalized, displayName.trim(), role, passwords.encode(password));
        return find(id).orElseThrow();
    }

    public List<Account> list() {
        return jdbc.query("SELECT * FROM console_user ORDER BY lower(display_name)", (rs, row) -> account(rs));
    }

    public Optional<Account> find(UUID id) {
        return jdbc.query("SELECT * FROM console_user WHERE id=?", (rs, row) -> account(rs), id).stream().findFirst();
    }

    @Transactional
    public Account update(UUID id, String role, Boolean active, UUID actingUserId) {
        Account target = find(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
        if (target.id().equals(actingUserId) && (Boolean.FALSE.equals(active) || (role != null && !"ADMIN".equals(role))))
            throw bad("You cannot remove your own administrator access");
        if (role != null && !Set.of("ADMIN", "SALES").contains(role)) throw bad("Role must be ADMIN or SALES");
        boolean losesAdmin = target.isAdmin() && (Boolean.FALSE.equals(active) || (role != null && !"ADMIN".equals(role)));
        if (losesAdmin && activeAdminCount() <= 1) throw bad("At least one active administrator is required");
        jdbc.update("UPDATE console_user SET role=COALESCE(?, role), active=COALESCE(?, active) WHERE id=?", role, active, id);
        if (Boolean.FALSE.equals(active)) jdbc.update("DELETE FROM console_session WHERE user_id=?", id);
        return find(id).orElseThrow();
    }

    /** Lost phone: the account enrols a new authenticator at its next login. */
    @Transactional
    public void resetSecondFactor(UUID id) {
        if (jdbc.update("UPDATE console_user SET totp_secret=NULL, totp_enabled=FALSE, last_totp_step=NULL WHERE id=?", id) == 0)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found");
        jdbc.update("DELETE FROM console_session WHERE user_id=?", id);
    }

    @Transactional
    public void resetPassword(UUID id, String password) {
        requireStrongPassword(password);
        if (jdbc.update("UPDATE console_user SET password_hash=?, failed_attempts=0, locked_until=NULL WHERE id=?",
                passwords.encode(password), id) == 0)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found");
        jdbc.update("DELETE FROM console_session WHERE user_id=?", id);
    }

    @Transactional
    public void changeOwnPassword(UUID id, String currentPassword, String newPassword) {
        String hash = jdbc.queryForObject("SELECT password_hash FROM console_user WHERE id=?", String.class, id);
        if (currentPassword == null || !passwords.matches(currentPassword, hash))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Current password is incorrect");
        resetPassword(id, newPassword);
    }

    // ------------------------------------------------------------------ login

    /**
     * Same answer for unknown e-mail, wrong password, locked or disabled account. The refusal must not roll back
     * the failure counter, otherwise the lockout would never trigger.
     */
    @Transactional(noRollbackFor = ResponseStatusException.class)
    public LoginResult login(String email, String password, Instant now) {
        ResponseStatusException denied = new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid e-mail or password");
        var rows = jdbc.query("SELECT * FROM console_user WHERE lower(email)=? FOR UPDATE",
                (rs, row) -> new Object[]{account(rs), rs.getString("password_hash"), rs.getInt("failed_attempts")},
                normalizeEmail(email));
        if (rows.isEmpty()) {
            passwords.matches(password == null ? "" : password, DUMMY_HASH);
            throw denied;
        }
        Account account = (Account) rows.get(0)[0];
        String hash = (String) rows.get(0)[1];
        int failed = (int) rows.get(0)[2];
        boolean locked = account.lockedUntil() != null && account.lockedUntil().isAfter(now);
        boolean matches = password != null && passwords.matches(password, hash);
        if (!account.active() || locked || !matches) {
            if (account.active() && !locked && !matches) {
                int attempts = failed + 1;
                Timestamp lockUntil = attempts >= MAX_FAILED_ATTEMPTS ? Timestamp.from(now.plus(LOCK_DURATION)) : null;
                jdbc.update("UPDATE console_user SET failed_attempts=?, locked_until=? WHERE id=?",
                        lockUntil == null ? attempts : 0, lockUntil, account.id());
            }
            throw denied;
        }
        jdbc.update("UPDATE console_user SET failed_attempts=0, locked_until=NULL WHERE id=?", account.id());
        String token = newToken();
        jdbc.update("INSERT INTO console_session(token_hash, user_id, second_factor_done, expires_at) VALUES (?, ?, FALSE, ?)",
                sha256(token), account.id(), Timestamp.from(now.plus(SESSION_MAX)));
        return new LoginResult(token, account.totpEnabled() ? "TOTP" : "ENROLL");
    }

    @Transactional(noRollbackFor = ResponseStatusException.class)
    public String verifySecondFactor(String token, String code, Instant now) {
        Session session = partialSession(token, now);
        var row = jdbc.query("SELECT totp_secret, last_totp_step FROM console_user WHERE id=? AND totp_enabled FOR UPDATE",
                (rs, n) -> new Object[]{rs.getString(1), rs.getObject(2) == null ? null : rs.getLong(2)},
                session.account().id());
        if (row.isEmpty()) throw bad("Second factor is not set up");
        OptionalLong step = totp.verify((String) row.get(0)[0], code, now, (Long) row.get(0)[1]);
        if (step.isEmpty()) {
            registerSecondFactorFailure(session.account().id(), token, now);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid code");
        }
        return completeLogin(session.account().id(), token, step.getAsLong(), now);
    }

    /** First login: returns the secret to add in the authenticator app (stored, not yet enabled). */
    @Transactional
    public Map<String, String> startEnrollment(String token, Instant now) {
        Session session = partialSession(token, now);
        if (session.account().totpEnabled()) throw bad("Second factor already enrolled");
        String secret = totp.newSecret();
        jdbc.update("UPDATE console_user SET totp_secret=? WHERE id=? AND NOT totp_enabled", secret, session.account().id());
        return Map.of("secret", secret, "uri", totp.provisioningUri(ISSUER, session.account().email(), secret));
    }

    @Transactional(noRollbackFor = ResponseStatusException.class)
    public String confirmEnrollment(String token, String code, Instant now) {
        Session session = partialSession(token, now);
        String secret = jdbc.queryForObject("SELECT totp_secret FROM console_user WHERE id=? AND NOT totp_enabled",
                String.class, session.account().id());
        OptionalLong step = secret == null ? OptionalLong.empty() : totp.verify(secret, code, now, null);
        if (step.isEmpty()) {
            registerSecondFactorFailure(session.account().id(), token, now);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid code");
        }
        jdbc.update("UPDATE console_user SET totp_enabled=TRUE WHERE id=?", session.account().id());
        return completeLogin(session.account().id(), token, step.getAsLong(), now);
    }

    public void logout(String token) {
        if (token != null) jdbc.update("DELETE FROM console_session WHERE token_hash=?", sha256(token));
    }

    // ------------------------------------------------------------------ sessions

    /** A session that passed the second factor; refreshes its idle timer. */
    public Optional<Session> fullSession(String token, Instant now) {
        return session(token, now).filter(Session::secondFactorDone);
    }

    Session partialSession(String token, Instant now) {
        return session(token, now).filter(value -> !value.secondFactorDone())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in again"));
    }

    private Optional<Session> session(String token, Instant now) {
        if (token == null || token.isBlank()) return Optional.empty();
        String hash = sha256(token);
        var rows = jdbc.query("""
                SELECT u.*, s.second_factor_done, s.last_seen_at, s.expires_at
                FROM console_session s JOIN console_user u ON u.id = s.user_id
                WHERE s.token_hash=?""", (rs, row) -> new Object[]{account(rs), rs.getBoolean("second_factor_done"),
                rs.getTimestamp("last_seen_at").toInstant(), rs.getTimestamp("expires_at").toInstant()}, hash);
        if (rows.isEmpty()) return Optional.empty();
        Account account = (Account) rows.get(0)[0];
        Instant lastSeen = (Instant) rows.get(0)[2];
        Instant expires = (Instant) rows.get(0)[3];
        if (!account.active() || !expires.isAfter(now) || lastSeen.plus(SESSION_IDLE).isBefore(now)) {
            jdbc.update("DELETE FROM console_session WHERE token_hash=?", hash);
            return Optional.empty();
        }
        jdbc.update("UPDATE console_session SET last_seen_at=? WHERE token_hash=?", Timestamp.from(now), hash);
        return Optional.of(new Session(account, (Boolean) rows.get(0)[1]));
    }

    /** Returns a new token: the partial-session token is discarded so it can never become a full session. */
    private String completeLogin(UUID userId, String token, long step, Instant now) {
        jdbc.update("UPDATE console_user SET last_totp_step=?, last_login_at=?, failed_attempts=0 WHERE id=?",
                step, Timestamp.from(now), userId);
        jdbc.update("DELETE FROM console_session WHERE token_hash=?", sha256(token));
        String fullToken = newToken();
        jdbc.update("INSERT INTO console_session(token_hash, user_id, second_factor_done, expires_at) VALUES (?, ?, TRUE, ?)",
                sha256(fullToken), userId, Timestamp.from(now.plus(SESSION_MAX)));
        return fullToken;
    }

    private void registerSecondFactorFailure(UUID userId, String token, Instant now) {
        Integer attempts = jdbc.queryForObject("UPDATE console_user SET failed_attempts=failed_attempts+1 WHERE id=? RETURNING failed_attempts",
                Integer.class, userId);
        if (attempts != null && attempts >= MAX_FAILED_ATTEMPTS) {
            jdbc.update("UPDATE console_user SET failed_attempts=0, locked_until=? WHERE id=?",
                    Timestamp.from(now.plus(LOCK_DURATION)), userId);
            jdbc.update("DELETE FROM console_session WHERE user_id=?", userId);
        }
    }

    private int activeAdminCount() {
        Integer count = jdbc.queryForObject("SELECT count(*) FROM console_user WHERE role='ADMIN' AND active", Integer.class);
        return count == null ? 0 : count;
    }

    private static Account account(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new Account(rs.getObject("id", UUID.class), rs.getString("email"), rs.getString("display_name"),
                rs.getString("role"), rs.getBoolean("totp_enabled"), rs.getBoolean("active"),
                rs.getTimestamp("last_login_at") == null ? null : rs.getTimestamp("last_login_at").toInstant(),
                rs.getTimestamp("locked_until") == null ? null : rs.getTimestamp("locked_until").toInstant());
    }

    private static void requireStrongPassword(String password) {
        if (password == null || password.length() < MIN_PASSWORD_LENGTH || password.length() > 128)
            throw bad("The password must contain at least " + MIN_PASSWORD_LENGTH + " characters");
    }

    private static String normalizeEmail(String email) {
        if (email == null || !email.trim().matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+") || email.length() > 254)
            throw bad("A valid e-mail is required");
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    static String newToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
