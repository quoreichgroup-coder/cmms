package com.grash.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.Signature;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class QuoreichLicenseClientTest {
    @TempDir Path directory;
    final ObjectMapper mapper = new ObjectMapper();
    KeyPair keys;
    QuoreichLicenseClient client;
    RestTemplate http;
    Map<String, Object> claims;

    @BeforeEach
    void setUp() throws Exception {
        keys = KeyPairGenerator.getInstance("Ed25519").generateKeyPair();
        Path publicKey = directory.resolve("public.pem");
        Files.writeString(publicKey, "-----BEGIN PUBLIC KEY-----\n" +
                Base64.getEncoder().encodeToString(keys.getPublic().getEncoded()) +
                "\n-----END PUBLIC KEY-----\n");
        FingerprintStore fingerprints = mock(FingerprintStore.class);
        when(fingerprints.getFingerprint()).thenReturn("a".repeat(64));
        client = new QuoreichLicenseClient(mapper, fingerprints);
        ReflectionTestUtils.setField(client, "publicKeyPath", publicKey.toString());
        ReflectionTestUtils.setField(client, "deploymentEnvironment", "PRODUCTION");
        ReflectionTestUtils.setField(client, "lastAuthorityCheck", Instant.now());
        http = mock(RestTemplate.class);
        ReflectionTestUtils.setField(client, "http", http);
        claims = new LinkedHashMap<>();
        claims.put("iss", "QUOREICH GROUP License Authority");
        claims.put("sub", "license-id");
        claims.put("fingerprint", "a".repeat(64));
        claims.put("environment", "PRODUCTION");
        claims.put("startsAt", Instant.now().minusSeconds(60).getEpochSecond());
        claims.put("exp", Instant.now().plusSeconds(3600).getEpochSecond());
        claims.put("licenseExpiresAt", null);
        claims.put("seatsFull", 2);
        claims.put("seatsLight", 5);
        claims.put("entitlements", List.of("SSO"));
    }

    @Test
    void validSignedOfflineLeaseGrantsItsSeatsAndEntitlements() throws Exception {
        cacheLease(keys);
        var state = client.getLicensingState();
        assertTrue(state.isValid());
        assertFalse(state.isReadOnly());
        assertEquals(2, state.getSeatsFull());
        assertEquals(5, state.getSeatsLight());
        assertTrue(state.getEntitlements().contains("SSO"));
        assertNull(state.getExpirationDate());
        verifyNoInteractions(http);
    }

    @Test
    void signatureFromAnotherKeyIsRejected() throws Exception {
        cacheLease(KeyPairGenerator.getInstance("Ed25519").generateKeyPair());
        assertReadOnly();
    }

    @Test
    void expiredOfflineLeaseIsRejected() throws Exception {
        claims.put("exp", Instant.now().minusSeconds(1).getEpochSecond());
        cacheLease(keys);
        assertReadOnly();
    }

    @Test
    void expiredSubscriptionIsReadOnlyEvenWithCurrentLease() throws Exception {
        claims.put("licenseExpiresAt", Instant.now().minusSeconds(1).getEpochSecond());
        cacheLease(keys);
        assertReadOnly();
    }

    @Test
    void leaseForAnotherInstallationIsRejected() throws Exception {
        claims.put("fingerprint", "b".repeat(64));
        cacheLease(keys);
        assertReadOnly();
    }

    @Test
    void leaseForAnotherEnvironmentIsRejected() throws Exception {
        claims.put("environment", "PREPRODUCTION");
        cacheLease(keys);
        assertReadOnly();
    }

    @ParameterizedTest
    @ValueSource(ints = {403, 404, 409})
    void explicitAuthorityRejectionBlocksExistingLease(int status) throws Exception {
        cacheLease(keys);
        rejectActivation(status);
        assertReadOnly();
    }

    @ParameterizedTest
    @ValueSource(ints = {408, 429})
    void temporaryAuthorityFailurePreservesValidOfflineLease(int status) throws Exception {
        cacheLease(keys);
        rejectActivation(status);
        assertTrue(client.getLicensingState().isValid());
        assertFalse(client.getLicensingState().isReadOnly());
    }

    @Test
    void firstTimeUnlicensedInstallationRemainsWritable() {
        var state = client.getLicensingState();
        assertFalse(state.isHasLicense());
        assertFalse(state.isReadOnly());
    }

    private void configureInteractiveActivation() {
        ReflectionTestUtils.setField(client, "authorityUrl", "https://authority.example");
        ReflectionTestUtils.setField(client, "cachePath", directory.resolve("license.lease").toString());
    }

    @Test
    void uiActivationPersistsKeyAndLeaseAndSurvivesRestart() throws Exception {
        configureInteractiveActivation();
        cacheLease(keys);
        String signed = (String) ReflectionTestUtils.getField(client, "cachedLease");
        ReflectionTestUtils.setField(client, "cachedLease", null);
        when(http.postForObject(anyString(), any(), eq(com.fasterxml.jackson.databind.JsonNode.class)))
                .thenReturn(mapper.readTree(mapper.writeValueAsString(Map.of("lease", signed))));
        assertTrue(client.activate("  new-key  ").isValid());
        Path stored = directory.resolve("license.lease.activation.json");
        assertEquals("new-key", mapper.readTree(Files.readString(stored)).path("licenseKey").asText());
        assertEquals(java.util.Set.of(java.nio.file.attribute.PosixFilePermission.OWNER_READ,
                java.nio.file.attribute.PosixFilePermission.OWNER_WRITE), Files.getPosixFilePermissions(stored));
        ReflectionTestUtils.setField(client, "licenseKey", "old-env-key");
        ReflectionTestUtils.setField(client, "cachedLease", null);
        client.loadCachedLease();
        assertEquals("new-key", ReflectionTestUtils.getField(client, "licenseKey"));
        assertTrue(client.getLicensingState().isValid());
    }

    @Test
    void invalidUiSignatureLeavesCurrentLicenseAndStoredKeyUnchanged() throws Exception {
        configureInteractiveActivation();
        cacheLease(keys);
        String original = (String) ReflectionTestUtils.getField(client, "cachedLease");
        cacheLease(KeyPairGenerator.getInstance("Ed25519").generateKeyPair());
        String invalid = (String) ReflectionTestUtils.getField(client, "cachedLease");
        ReflectionTestUtils.setField(client, "cachedLease", original);
        ReflectionTestUtils.setField(client, "licenseKey", "original-key");
        when(http.postForObject(anyString(), any(), eq(com.fasterxml.jackson.databind.JsonNode.class)))
                .thenReturn(mapper.readTree(mapper.writeValueAsString(Map.of("lease", invalid))));
        assertThrows(com.grash.exception.CustomException.class, () -> client.activate("bad-key"));
        assertEquals("original-key", ReflectionTestUtils.getField(client, "licenseKey"));
        assertEquals(original, ReflectionTestUtils.getField(client, "cachedLease"));
        assertFalse(Files.exists(directory.resolve("license.lease.activation.json")));
        assertTrue(client.getLicensingState().isValid());
    }

    @Test
    void uiRejectionDoesNotInvalidateTheExistingLicense() throws Exception {
        configureInteractiveActivation();
        cacheLease(keys);
        when(http.postForObject(anyString(), any(), eq(com.fasterxml.jackson.databind.JsonNode.class)))
                .thenThrow(new HttpClientErrorException(HttpStatus.CONFLICT));
        var error = assertThrows(com.grash.exception.CustomException.class, () -> client.activate("occupied-key"));
        assertEquals(HttpStatus.CONFLICT, error.getHttpStatus());
        assertTrue(client.getLicensingState().isValid());
    }

    @Test
    void uiActivationRequiresPersistentStorageConfiguration() {
        assertThrows(com.grash.exception.CustomException.class, () -> client.activate("new-key"));
        verifyNoInteractions(http);
    }

    private void rejectActivation(int status) {
        ReflectionTestUtils.setField(client, "lastAuthorityCheck", Instant.EPOCH);
        ReflectionTestUtils.setField(client, "licenseKey", "test-key");
        ReflectionTestUtils.setField(client, "authorityUrl", "https://authority.example");
        when(http.postForObject(anyString(), any(), eq(com.fasterxml.jackson.databind.JsonNode.class)))
                .thenThrow(new HttpClientErrorException(HttpStatus.valueOf(status)));
    }

    private void assertReadOnly() {
        var state = client.getLicensingState();
        assertFalse(state.isValid());
        assertTrue(state.isReadOnly());
    }

    private void cacheLease(KeyPair signingKeys) throws Exception {
        String header = encode(mapper.writeValueAsBytes(Map.of("alg", "EdDSA", "typ", "JWT")));
        String payload = encode(mapper.writeValueAsBytes(claims));
        String input = header + "." + payload;
        Signature signature = Signature.getInstance("Ed25519");
        signature.initSign(signingKeys.getPrivate());
        signature.update(input.getBytes(StandardCharsets.US_ASCII));
        ReflectionTestUtils.setField(client, "cachedLease", input + "." + encode(signature.sign()));
    }

    private String encode(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
