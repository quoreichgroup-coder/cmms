package com.grash.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.grash.configuration.LicenseReadOnlyFilter;
import com.grash.repository.KeygenRequestTrackerRepository;
import com.grash.service.FingerprintStore;
import com.grash.service.LicenseService;
import com.grash.service.QuoreichLicenseClient;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.http.*;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.net.ServerSocket;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyPairGenerator;
import java.sql.DriverManager;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Runs the real packaged authority against PostgreSQL and the production QPM client over HTTP. */
@EnabledIfEnvironmentVariable(named = "QPM_LICENSE_TEST_DB_URL", matches = ".+")
@EnabledIfEnvironmentVariable(named = "QPM_LICENSE_AUTHORITY_TEST_JAR", matches = ".+")
class QuoreichAuthorityClientIntegrationTest {
    static final String SCHEMA = "qpm_client_" + UUID.randomUUID().toString().replace("-", "");
    static final String TOKEN = UUID.randomUUID().toString();
    static final ObjectMapper MAPPER = new ObjectMapper();
    static final RestTemplate HTTP = new RestTemplate();
    static Path directory;
    static Path publicKey;
    static Process authority;
    static String authorityUrl;

    @BeforeAll
    static void startAuthority() throws Exception {
        try (var connection = DriverManager.getConnection(url(), user(), password());
             var statement = connection.createStatement()) {
            statement.execute("CREATE SCHEMA " + SCHEMA);
        }
        directory = Files.createTempDirectory("qpm-client-authority-test-");
        var keys = KeyPairGenerator.getInstance("Ed25519").generateKeyPair();
        Path privateKey = directory.resolve("private.pem");
        publicKey = directory.resolve("public.pem");
        Files.writeString(privateKey, "-----BEGIN PRIVATE KEY-----\n" +
                Base64.getEncoder().encodeToString(keys.getPrivate().getEncoded()) + "\n-----END PRIVATE KEY-----\n");
        Files.writeString(publicKey, "-----BEGIN PUBLIC KEY-----\n" +
                Base64.getEncoder().encodeToString(keys.getPublic().getEncoded()) + "\n-----END PUBLIC KEY-----\n");
        int port = unusedPort();
        authorityUrl = "http://127.0.0.1:" + port;
        Properties properties = new Properties();
        properties.setProperty("server.address", "127.0.0.1");
        properties.setProperty("server.port", String.valueOf(port));
        properties.setProperty("spring.datasource.url", url());
        properties.setProperty("spring.datasource.username", user());
        properties.setProperty("spring.datasource.password", password());
        properties.setProperty("spring.datasource.hikari.schema", SCHEMA);
        properties.setProperty("license-authority.admin-token", TOKEN);
        properties.setProperty("license-authority.private-key-path", privateKey.toString());
        Path configuration = directory.resolve("test.properties");
        try (var output = Files.newOutputStream(configuration)) { properties.store(output, "Ephemeral test configuration"); }
        Path jar = Path.of(System.getenv("QPM_LICENSE_AUTHORITY_TEST_JAR")).toAbsolutePath();
        assertTrue(Files.isRegularFile(jar), "Build the authority JAR before running this test");
        authority = new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", "java").toString(),
                "-Xmx256m", "-jar", jar.toString(), "--spring.config.additional-location=" + configuration.toUri())
                .redirectErrorStream(true).redirectOutput(directory.resolve("authority.log").toFile()).start();
        for (int attempt = 0; attempt < 200; attempt++) {
            assertTrue(authority.isAlive(), "Authority exited before becoming ready");
            try {
                if (HTTP.getForEntity(authorityUrl + "/actuator/health", JsonNode.class).getStatusCode() == HttpStatus.OK) return;
            } catch (Exception notReady) {
                Thread.sleep(100);
            }
        }
        fail("Authority did not become ready");
    }

    @AfterAll
    static void cleanup() throws Exception {
        if (authority != null) {
            authority.destroy();
            if (!authority.waitFor(10, TimeUnit.SECONDS)) {
                authority.destroyForcibly();
                assertTrue(authority.waitFor(5, TimeUnit.SECONDS));
            }
        }
        try (var connection = DriverManager.getConnection(url(), user(), password());
             var statement = connection.createStatement()) {
            statement.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
        } finally {
            if (directory != null) {
                try (var paths = Files.walk(directory)) {
                    for (Path path : paths.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
                }
            }
        }
    }

    @Test
    void activationAndOfflineRestartPreserveSignedEntitlements() throws Exception {
        JsonNode license = issue();
        Path cache = directory.resolve("restart.lease");
        var client = client(license, "a".repeat(64), cache, authorityUrl);
        var online = client.getLicensingState();
        assertTrue(online.isValid());
        assertEquals(2, online.getSeatsFull());
        assertEquals(5, online.getSeatsLight());
        assertTrue(online.getEntitlements().contains("SSO"));
        assertTrue(Files.isRegularFile(cache));
        var restarted = client(license, "a".repeat(64), cache, "http://127.0.0.1:" + unusedPort());
        var offline = restarted.getLicensingState();
        assertTrue(offline.isValid());
        assertEquals(online.getLicenseId(), offline.getLicenseId());
        assertEquals(online.getEntitlements(), offline.getEntitlements());
    }

    @Test
    void revocationMakesQpmReadOnlyButKeepsExportAccessible() throws Exception {
        JsonNode license = issue();
        var client = client(license, "b".repeat(64), directory.resolve("revoked.lease"), authorityUrl);
        assertTrue(client.getLicensingState().isValid());
        admin(HttpMethod.POST, "/admin/licenses/" + license.path("id").asText() + "/revoke", null);
        ReflectionTestUtils.setField(client, "lastAuthorityCheck", Instant.EPOCH);
        assertTrue(client.getLicensingState().isReadOnly());
        var licenses = new LicenseService(MAPPER, mock(KeygenRequestTrackerRepository.class), new MockEnvironment());
        ReflectionTestUtils.setField(licenses, "licenseProvider", "QUOREICH");
        ReflectionTestUtils.setField(licenses, "quoreichLicenseClient", client);
        var filter = new LicenseReadOnlyFilter(licenses, MAPPER);
        ReflectionTestUtils.setField(filter, "enforcementEnabled", true);
        FilterChain chain = mock(FilterChain.class);
        var write = new MockHttpServletResponse();
        filter.doFilter(new MockHttpServletRequest("POST", "/assets"), write, chain);
        assertEquals(423, write.getStatus());
        assertTrue(write.getContentAsString().contains("LICENSE_READ_ONLY"));
        verifyNoInteractions(chain);
        var exportRequest = new MockHttpServletRequest("GET", "/export/assets");
        var exportResponse = new MockHttpServletResponse();
        filter.doFilter(exportRequest, exportResponse, chain);
        verify(chain).doFilter(exportRequest, exportResponse);
    }

    @Test
    void anotherInstallationCannotUseCopiedOfflineLease() throws Exception {
        JsonNode license = issue();
        Path cache = directory.resolve("copied.lease");
        assertTrue(client(license, "c".repeat(64), cache, authorityUrl).getLicensingState().isValid());
        var copy = client(license, "d".repeat(64), cache, "http://127.0.0.1:" + unusedPort());
        assertTrue(copy.getLicensingState().isReadOnly());
    }

    @Test
    void changedLeaseSignatureIsRejectedAfterRestart() throws Exception {
        JsonNode license = issue();
        Path cache = directory.resolve("tampered.lease");
        assertTrue(client(license, "e".repeat(64), cache, authorityUrl).getLicensingState().isValid());
        String lease = Files.readString(cache);
        String[] parts = lease.split("\\.");
        byte[] signature = Base64.getUrlDecoder().decode(parts[2]);
        signature[0] ^= 1;
        Files.writeString(cache, parts[0] + "." + parts[1] + "." +
                Base64.getUrlEncoder().withoutPadding().encodeToString(signature));
        var restarted = client(license, "e".repeat(64), cache, "http://127.0.0.1:" + unusedPort());
        assertTrue(restarted.getLicensingState().isReadOnly());
    }

    private QuoreichLicenseClient client(JsonNode license, String fingerprint, Path cache, String endpoint) {
        FingerprintStore store = new FingerprintStore();
        ReflectionTestUtils.setField(store, "configuredFingerprint", fingerprint);
        var client = new QuoreichLicenseClient(MAPPER, store);
        ReflectionTestUtils.setField(client, "licenseKey", license.path("licenseKey").asText());
        ReflectionTestUtils.setField(client, "authorityUrl", endpoint);
        ReflectionTestUtils.setField(client, "publicKeyPath", publicKey.toString());
        ReflectionTestUtils.setField(client, "cachePath", cache.toString());
        ReflectionTestUtils.setField(client, "deploymentEnvironment", "PRODUCTION");
        ReflectionTestUtils.invokeMethod(client, "loadCachedLease");
        return client;
    }

    private JsonNode issue() {
        var response = admin(HttpMethod.POST, "/admin/licenses", Map.of(
                "customerName", "QPM client integration", "edition", "ENTERPRISE", "licenseType", "PERPETUAL",
                "seatsFull", 2, "seatsLight", 5, "entitlements", List.of("SSO"),
                "startsAt", Instant.now().minusSeconds(60).toString()));
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        return response.getBody();
    }

    private ResponseEntity<JsonNode> admin(HttpMethod method, String path, Object body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(TOKEN);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return HTTP.exchange(authorityUrl + path, method, new HttpEntity<>(body, headers), JsonNode.class);
    }

    static int unusedPort() throws Exception {
        try (var socket = new ServerSocket(0, 0, java.net.InetAddress.getLoopbackAddress())) { return socket.getLocalPort(); }
    }
    static String url() { return System.getenv("QPM_LICENSE_TEST_DB_URL"); }
    static String user() { return System.getenv().getOrDefault("QPM_LICENSE_TEST_DB_USER", "qpm_test"); }
    static String password() { return System.getenv().getOrDefault("QPM_LICENSE_TEST_DB_PASSWORD", ""); }
}
