package group.quoreich.license.authority.console;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyPairGenerator;
import java.sql.DriverManager;
import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Console end to end over HTTP on a temporary schema: sign-in with mandatory second factor, roles enforced by
 * the server, CSRF header, lockout, suspension blocking activation and catalogue licences in the lease.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@EnabledIfEnvironmentVariable(named = "QPM_LICENSE_TEST_DB_URL", matches = ".+")
class ConsoleIntegrationTest {
    private static final String SCHEMA = "qpm_console_" + UUID.randomUUID().toString().replace("-", "");
    private static final String ADMIN_TOKEN = UUID.randomUUID().toString();
    private static final String PASSWORD = "correct horse battery staple";
    private static Path keyDirectory;
    private static Path privateKey;
    private final ObjectMapper mapper = new ObjectMapper();
    private final TotpService totp = new TotpService();

    @Autowired TestRestTemplate http;
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry properties) throws Exception {
        try (var connection = DriverManager.getConnection(env("QPM_LICENSE_TEST_DB_URL", ""),
                env("QPM_LICENSE_TEST_DB_USER", "qpm_test"), env("QPM_LICENSE_TEST_DB_PASSWORD", ""));
             var statement = connection.createStatement()) {
            statement.execute("CREATE SCHEMA " + SCHEMA);
        }
        var keys = KeyPairGenerator.getInstance("Ed25519").generateKeyPair();
        keyDirectory = Files.createTempDirectory("qpm-console-test-");
        privateKey = keyDirectory.resolve("private.pem");
        Files.writeString(privateKey, "-----BEGIN PRIVATE KEY-----\n"
                + Base64.getEncoder().encodeToString(keys.getPrivate().getEncoded()) + "\n-----END PRIVATE KEY-----\n");
        properties.add("spring.datasource.url", () -> env("QPM_LICENSE_TEST_DB_URL", ""));
        properties.add("spring.datasource.username", () -> env("QPM_LICENSE_TEST_DB_USER", "qpm_test"));
        properties.add("spring.datasource.password", () -> env("QPM_LICENSE_TEST_DB_PASSWORD", ""));
        properties.add("spring.datasource.hikari.schema", () -> SCHEMA);
        properties.add("license-authority.private-key-path", () -> privateKey.toString());
        properties.add("license-authority.admin-token", () -> ADMIN_TOKEN);
    }

    @AfterAll
    static void cleanup() throws Exception {
        try (var connection = DriverManager.getConnection(env("QPM_LICENSE_TEST_DB_URL", ""),
                env("QPM_LICENSE_TEST_DB_USER", "qpm_test"), env("QPM_LICENSE_TEST_DB_PASSWORD", ""));
             var statement = connection.createStatement()) {
            statement.execute("DROP SCHEMA " + SCHEMA + " CASCADE");
        } finally {
            Files.deleteIfExists(privateKey);
            Files.deleteIfExists(keyDirectory);
        }
    }

    @Test
    void consoleRequiresASessionAndTheCsrfHeader() {
        assertEquals(HttpStatus.UNAUTHORIZED, call(HttpMethod.GET, "/console-api/dashboard", null, null).getStatusCode());
        HttpHeaders noCsrf = new HttpHeaders();
        noCsrf.setContentType(MediaType.APPLICATION_JSON);
        var response = http.exchange("/console-api/auth/login", HttpMethod.POST,
                new HttpEntity<>(Map.of("email", "x@y.bf", "password", "whatever-password"), noCsrf), String.class);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals("DENY", response.getHeaders().getFirst("X-Frame-Options"));
    }

    @Test
    void adminAndSalesFollowTheirRolesAndEveryActionNamesItsAuthor() throws Exception {
        String admin = signInNewAccount("admin-" + UUID.randomUUID() + "@quoreich.bf", "ADMIN", null);
        String salesEmail = "sales-" + UUID.randomUUID() + "@quoreich.bf";
        assertEquals(HttpStatus.OK, call(HttpMethod.POST, "/console-api/users",
                Map.of("email", salesEmail, "displayName", "Commercial", "role", "SALES", "password", PASSWORD), admin).getStatusCode());
        String sales = signIn(salesEmail);

        var customer = call(HttpMethod.POST, "/console-api/customers",
                Map.of("name", "Mine de Test " + UUID.randomUUID(), "country", "Burkina Faso"), sales);
        assertEquals(HttpStatus.OK, customer.getStatusCode());
        String customerId = customer.getBody().path("id").asText();

        var issued = call(HttpMethod.POST, "/console-api/licenses",
                Map.of("customerId", customerId, "planCode", "PROFESSIONAL"), sales);
        assertEquals(HttpStatus.OK, issued.getStatusCode());
        String licenseId = issued.getBody().path("id").asText();
        String key = issued.getBody().path("licenseKey").asText();
        assertTrue(key.startsWith("QPM-"));

        // Sales cannot widen a plan, suspend, revoke or edit the catalogue.
        assertEquals(HttpStatus.FORBIDDEN, call(HttpMethod.POST, "/console-api/licenses",
                Map.of("customerId", customerId, "planCode", "ESSENTIAL", "entitlements", List.of("SSO")), sales).getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, call(HttpMethod.POST, "/console-api/licenses/" + licenseId + "/revoke",
                Map.of("reason", "test"), sales).getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, call(HttpMethod.POST, "/console-api/licenses/" + licenseId + "/suspend",
                Map.of("reason", "test"), sales).getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, call(HttpMethod.GET, "/console-api/users", null, sales).getStatusCode());
        // Unknown entitlement codes are refused, even for an administrator.
        assertEquals(HttpStatus.BAD_REQUEST, call(HttpMethod.POST, "/console-api/licenses/" + licenseId + "/entitlements",
                Map.of("entitlements", List.of("NOT_A_FEATURE")), admin).getStatusCode());

        // Catalogue licence: QPM receives catalogVersion 2 in the signed lease.
        var lease = http.postForEntity("/v1/activate", Map.of("licenseKey", key, "fingerprint", "c".repeat(64),
                "environment", "PRODUCTION"), JsonNode.class);
        assertEquals(HttpStatus.OK, lease.getStatusCode());
        JsonNode claims = mapper.readTree(Base64.getUrlDecoder().decode(lease.getBody().path("lease").asText().split("\\.")[1]));
        assertEquals(2, claims.path("catalogVersion").asInt());
        assertTrue(claims.path("entitlements").toString().contains("PROCUREMENT"));

        // Suspension blocks activation until resumed.
        assertEquals(HttpStatus.OK, call(HttpMethod.POST, "/console-api/licenses/" + licenseId + "/suspend",
                Map.of("reason", "Facture impayée"), admin).getStatusCode());
        assertEquals("SUSPENDED", call(HttpMethod.GET, "/console-api/licenses/" + licenseId, null, sales).getBody().path("state").asText());
        assertEquals(HttpStatus.FORBIDDEN, http.postForEntity("/v1/activate", Map.of("licenseKey", key,
                "fingerprint", "c".repeat(64), "environment", "PRODUCTION"), JsonNode.class).getStatusCode());
        assertEquals(HttpStatus.OK, call(HttpMethod.POST, "/console-api/licenses/" + licenseId + "/resume", Map.of(), admin).getStatusCode());

        var renewed = call(HttpMethod.POST, "/console-api/licenses/" + licenseId + "/renew", Map.of("months", 12), sales);
        assertEquals(HttpStatus.OK, renewed.getStatusCode());
        JsonNode events = renewed.getBody().path("events");
        assertEquals(salesEmail, findEvent(events, "LICENSE_RENEWED").path("actor").asText());
        assertEquals(salesEmail, findEvent(events, "LICENSE_ISSUED").path("actor").asText());
        assertTrue(findEvent(events, "LICENSE_SUSPENDED").path("actor").asText().startsWith("admin-"));
    }

    @Test
    void secondFactorRotatesTheSessionAndWrongPasswordsLockTheAccount() {
        String email = "lock-" + UUID.randomUUID() + "@quoreich.bf";
        assertEquals(HttpStatus.CREATED, adminToken(Map.of("email", email, "displayName", "Lock", "role", "SALES",
                "password", PASSWORD)).getStatusCode());
        var login = call(HttpMethod.POST, "/console-api/auth/login", Map.of("email", email, "password", PASSWORD), null);
        String partial = cookie(login);
        assertEquals("ENROLL", login.getBody().path("nextStep").asText());
        assertEquals(HttpStatus.UNAUTHORIZED, call(HttpMethod.GET, "/console-api/dashboard", null, partial).getStatusCode(),
                "a password alone never opens the console");
        String full = enroll(partial);
        assertNotEquals(partial, full);
        assertEquals(HttpStatus.UNAUTHORIZED, call(HttpMethod.GET, "/console-api/dashboard", null, partial).getStatusCode());
        assertEquals(HttpStatus.OK, call(HttpMethod.GET, "/console-api/dashboard", null, full).getStatusCode());

        for (int attempt = 0; attempt < ConsoleAccountService.MAX_FAILED_ATTEMPTS; attempt++) {
            call(HttpMethod.POST, "/console-api/auth/login", Map.of("email", email, "password", "wrong password!!"), null);
        }
        assertEquals(HttpStatus.UNAUTHORIZED, call(HttpMethod.POST, "/console-api/auth/login",
                Map.of("email", email, "password", PASSWORD), null).getStatusCode(), "locked even with the right password");
    }

    // ------------------------------------------------------------------ helpers

    private String signInNewAccount(String email, String role, String unused) {
        assertEquals(HttpStatus.CREATED, adminToken(Map.of("email", email, "displayName", "Admin", "role", role,
                "password", PASSWORD)).getStatusCode());
        return signIn(email);
    }

    private String signIn(String email) {
        var login = call(HttpMethod.POST, "/console-api/auth/login", Map.of("email", email, "password", PASSWORD), null);
        assertEquals(HttpStatus.OK, login.getStatusCode());
        return enroll(cookie(login));
    }

    private String enroll(String partial) {
        var enrollment = call(HttpMethod.GET, "/console-api/auth/enroll", null, partial);
        String secret = enrollment.getBody().path("secret").asText();
        String code = totp.generate(TotpService.decodeBase32(secret), Instant.now().getEpochSecond() / 30);
        var confirmed = call(HttpMethod.POST, "/console-api/auth/enroll", Map.of("code", code), partial);
        assertEquals(HttpStatus.OK, confirmed.getStatusCode());
        return cookie(confirmed);
    }

    private ResponseEntity<JsonNode> adminToken(Map<String, Object> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(ADMIN_TOKEN);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return http.exchange("/admin/console-users", HttpMethod.POST, new HttpEntity<>(body, headers), JsonNode.class);
    }

    private ResponseEntity<JsonNode> call(HttpMethod method, String path, Object body, String sessionCookie) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set(ConsoleSecurityFilter.CSRF_HEADER, "1");
        if (sessionCookie != null) headers.add(HttpHeaders.COOKIE, ConsoleSecurityFilter.COOKIE + "=" + sessionCookie);
        return http.exchange(path, method, new HttpEntity<>(body, headers), JsonNode.class);
    }

    private static String cookie(ResponseEntity<?> response) {
        String header = response.getHeaders().getFirst(HttpHeaders.SET_COOKIE);
        assertNotNull(header, "session cookie");
        assertTrue(header.contains("HttpOnly") && header.contains("SameSite=Strict") && header.contains("Secure"));
        return header.substring(header.indexOf('=') + 1, header.indexOf(';'));
    }

    private static JsonNode findEvent(JsonNode events, String type) {
        for (JsonNode event : events) if (type.equals(event.path("type").asText())) return event;
        fail("missing event " + type);
        return null;
    }

    private static String env(String name, String fallback) {
        return System.getenv().getOrDefault(name, fallback);
    }
}
