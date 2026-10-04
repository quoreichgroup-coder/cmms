package group.quoreich.license.authority;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.Signature;
import java.sql.DriverManager;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.*;

/** Uses its own temporary schema; the database must be reserved for testing. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@EnabledIfEnvironmentVariable(named = "QPM_LICENSE_TEST_DB_URL", matches = ".+")
class LicenseAuthorityIntegrationTest {
    private static final String SCHEMA = "qpm_test_" + UUID.randomUUID().toString().replace("-", "");
    private static final String ADMIN_TOKEN = UUID.randomUUID().toString();
    private static KeyPair keys;
    private static Path keyDirectory;
    private static Path privateKey;

    @Autowired TestRestTemplate http;
    @Autowired JdbcTemplate jdbc;

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry properties) throws Exception {
        try (var connection = DriverManager.getConnection(databaseUrl(), databaseUser(), databasePassword());
             var statement = connection.createStatement()) {
            statement.execute("CREATE SCHEMA " + SCHEMA);
        }
        keys = KeyPairGenerator.getInstance("Ed25519").generateKeyPair();
        keyDirectory = Files.createTempDirectory("qpm-license-test-");
        privateKey = keyDirectory.resolve("private.pem");
        Files.writeString(privateKey, "-----BEGIN PRIVATE KEY-----\n" +
                Base64.getEncoder().encodeToString(keys.getPrivate().getEncoded()) +
                "\n-----END PRIVATE KEY-----\n");
        properties.add("spring.datasource.url", LicenseAuthorityIntegrationTest::databaseUrl);
        properties.add("spring.datasource.username", LicenseAuthorityIntegrationTest::databaseUser);
        properties.add("spring.datasource.password", LicenseAuthorityIntegrationTest::databasePassword);
        properties.add("spring.datasource.hikari.schema", () -> SCHEMA);
        properties.add("license-authority.private-key-path", () -> privateKey.toString());
        properties.add("license-authority.admin-token", () -> ADMIN_TOKEN);
    }

    @AfterAll
    static void cleanup() throws Exception {
        try (var connection = DriverManager.getConnection(databaseUrl(), databaseUser(), databasePassword());
             var statement = connection.createStatement()) {
            statement.execute("DROP SCHEMA " + SCHEMA + " CASCADE");
        } finally {
            if (privateKey != null) Files.deleteIfExists(privateKey);
            if (keyDirectory != null) Files.deleteIfExists(keyDirectory);
        }
    }

    @Test
    void adminEndpointsRequireAuthentication() {
        assertEquals(HttpStatus.UNAUTHORIZED, http.getForEntity("/admin/licenses", JsonNode.class).getStatusCode());
        assertEquals(HttpStatus.OK, http.getForEntity("/", String.class).getStatusCode());
    }

    @Test
    void subscriptionsAndPerpetualLicensesPersistWithoutExposingKeys() {
        JsonNode subscription = issue("SUBSCRIPTION");
        JsonNode perpetual = issue("PERPETUAL");
        assertTrue(subscription.path("licenseKey").asText().startsWith("QPM-"));
        var listed = admin(HttpMethod.GET, "/admin/licenses", null);
        assertEquals(HttpStatus.OK, listed.getStatusCode());
        assertFalse(listed.getBody().toString().contains(subscription.path("licenseKey").asText()));
        assertFalse(listed.getBody().toString().contains(perpetual.path("licenseKey").asText()));
        String hash = jdbc.queryForObject("SELECT key_hash FROM license_record WHERE id=?",
                String.class, UUID.fromString(subscription.path("id").asText()));
        assertEquals(64, hash.length());
        assertNotEquals(subscription.path("licenseKey").asText(), hash);
        assertNull(jdbc.queryForObject("SELECT expires_at FROM license_record WHERE id=?",
                java.sql.Timestamp.class, UUID.fromString(perpetual.path("id").asText())));
    }

    @Test
    void subscriptionRequiresExpiry() {
        var request = licenseRequest("SUBSCRIPTION");
        request.remove("expiresAt");
        assertEquals(HttpStatus.BAD_REQUEST, admin(HttpMethod.POST, "/admin/licenses", request).getStatusCode());
    }

    @Test
    void invalidFingerprintIsRejected() {
        JsonNode license = issue("PERPETUAL");
        assertEquals(HttpStatus.BAD_REQUEST,
                activate(license, "invalid", "PRODUCTION").getStatusCode());
    }

    @Test
    void signedLeaseCarriesExpectedInstallationAndSeats() throws Exception {
        JsonNode license = issue("PERPETUAL");
        var response = activate(license, "a".repeat(64), "PRODUCTION");
        assertEquals(HttpStatus.OK, response.getStatusCode());
        String[] parts = response.getBody().path("lease").asText().split("\\.");
        assertEquals(3, parts.length);
        Signature verifier = Signature.getInstance("Ed25519");
        verifier.initVerify(keys.getPublic());
        verifier.update((parts[0] + "." + parts[1]).getBytes(StandardCharsets.US_ASCII));
        assertTrue(verifier.verify(Base64.getUrlDecoder().decode(parts[2])));
        var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        JsonNode claims = mapper.readTree(Base64.getUrlDecoder().decode(parts[1]));
        assertEquals(license.path("id").asText(), claims.path("sub").asText());
        assertEquals("a".repeat(64), claims.path("fingerprint").asText());
        assertEquals(2, claims.path("seatsFull").asInt());
        assertEquals(5, claims.path("seatsLight").asInt());
        assertEquals("PRODUCTION", claims.path("environment").asText());
        assertEquals(30 * 86400L, claims.path("exp").asLong() - claims.path("iat").asLong());
    }

    @Test
    void activationReplacementAndRevocationRespectSlots() {
        JsonNode license = issue("PERPETUAL");
        assertEquals(HttpStatus.OK, activate(license, "a".repeat(64), "PRODUCTION").getStatusCode());
        assertEquals(HttpStatus.OK, activate(license, "a".repeat(64), "PRODUCTION").getStatusCode());
        assertEquals(HttpStatus.CONFLICT, activate(license, "b".repeat(64), "PRODUCTION").getStatusCode());
        assertEquals(HttpStatus.OK, activate(license, "c".repeat(64), "PREPRODUCTION").getStatusCode());
        assertEquals(HttpStatus.CONFLICT, activate(license, "a".repeat(64), "PREPRODUCTION").getStatusCode());
        String id = license.path("id").asText();
        var activations = admin(HttpMethod.GET, "/admin/licenses/" + id + "/activations", null).getBody();
        String productionId = null;
        for (JsonNode activation : activations) {
            if ("PRODUCTION".equals(activation.path("environment").asText())) {
                productionId = activation.path("id").asText();
            }
        }
        assertNotNull(productionId);
        assertEquals(HttpStatus.NO_CONTENT, admin(HttpMethod.POST,
                "/admin/licenses/activations/" + productionId + "/deactivate", null).getStatusCode());
        assertEquals(HttpStatus.OK, activate(license, "b".repeat(64), "PRODUCTION").getStatusCode());
        assertEquals(HttpStatus.CONFLICT, activate(license, "a".repeat(64), "PRODUCTION").getStatusCode());
        assertEquals(HttpStatus.NO_CONTENT, admin(HttpMethod.POST,
                "/admin/licenses/" + id + "/revoke", null).getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, activate(license, "b".repeat(64), "PRODUCTION").getStatusCode());
        JsonNode events = admin(HttpMethod.GET, "/admin/licenses/" + id + "/events", null).getBody();
        assertTrue(events.size() >= 6);
    }

    @Test
    void simultaneousProductionActivationsGrantOnlyOneSlot() {
        JsonNode license = issue("PERPETUAL");
        var first = CompletableFuture.supplyAsync(() -> activate(license, "d".repeat(64), "PRODUCTION").getStatusCode());
        var second = CompletableFuture.supplyAsync(() -> activate(license, "e".repeat(64), "PRODUCTION").getStatusCode());
        var statuses = List.of(first.join(), second.join());
        assertEquals(1, Collections.frequency(statuses, HttpStatus.OK));
        assertEquals(1, Collections.frequency(statuses, HttpStatus.CONFLICT));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM license_activation WHERE license_id=? AND deactivated_at IS NULL",
                Integer.class, UUID.fromString(license.path("id").asText())));
    }

    private JsonNode issue(String type) {
        var response = admin(HttpMethod.POST, "/admin/licenses", licenseRequest(type));
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        return response.getBody();
    }

    private Map<String, Object> licenseRequest(String type) {
        var request = new LinkedHashMap<String, Object>();
        request.put("customerName", "Integration test");
        request.put("edition", "ENTERPRISE");
        request.put("licenseType", type);
        request.put("seatsFull", 2);
        request.put("seatsLight", 5);
        request.put("entitlements", List.of("SSO"));
        request.put("startsAt", Instant.now().minusSeconds(60).toString());
        if ("SUBSCRIPTION".equals(type)) request.put("expiresAt", Instant.now().plusSeconds(86400).toString());
        return request;
    }

    private ResponseEntity<JsonNode> activate(JsonNode license, String fingerprint, String environment) {
        return http.postForEntity("/v1/activate", Map.of("licenseKey", license.path("licenseKey").asText(),
                "fingerprint", fingerprint, "environment", environment), JsonNode.class);
    }

    private ResponseEntity<JsonNode> admin(HttpMethod method, String path, Object body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(ADMIN_TOKEN);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return http.exchange(path, method, new HttpEntity<>(body, headers), JsonNode.class);
    }

    private static String databaseUrl() {
        return System.getenv("QPM_LICENSE_TEST_DB_URL");
    }

    private static String databaseUser() {
        return System.getenv().getOrDefault("QPM_LICENSE_TEST_DB_USER", "qpm_test");
    }

    private static String databasePassword() {
        return System.getenv().getOrDefault("QPM_LICENSE_TEST_DB_PASSWORD", "");
    }
}
