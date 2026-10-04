package com.grash.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.grash.dto.license.LicensingState;
import com.grash.exception.CustomException;
import org.springframework.http.HttpStatus;
import java.nio.file.StandardCopyOption;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.client.SimpleClientHttpRequestFactory;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.time.Instant;
import java.util.*;

@Service
@Slf4j
public class QuoreichLicenseClient {
    private final ObjectMapper mapper;
    private final RestTemplate http;
    private final FingerprintStore fingerprintStore;

    @Value("${license-key:}")
    private String licenseKey;
    @Value("${license-authority-url:}")
    private String authorityUrl;
    @Value("${license-public-key-path:}")
    private String publicKeyPath;
    @Value("${license-cache-path:}")
    private String cachePath;
    @Value("${license-environment:PRODUCTION}")
    private String deploymentEnvironment;
    private volatile String cachedLease;
    private volatile PublicKey publicKey;
    private volatile Instant lastAuthorityCheck = Instant.EPOCH;
    private volatile boolean onlineRejected;

    public QuoreichLicenseClient(ObjectMapper mapper, FingerprintStore fingerprintStore) {
        this.mapper = mapper;
        this.fingerprintStore = fingerprintStore;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(5000);
        this.http = new RestTemplate(factory);
    }

    @PostConstruct
    void loadCachedLease() {
        if (cachePath == null || cachePath.isBlank()) return;
        try {
            Path activation = activationPath();
            if (Files.isRegularFile(activation)) {
                JsonNode stored = mapper.readTree(Files.readString(activation));
                licenseKey = stored.path("licenseKey").asText();
                cachedLease = stored.path("lease").asText();
            } else {
                Path path = Path.of(cachePath);
                if (Files.isRegularFile(path)) cachedLease = Files.readString(path).trim();
            }
        } catch (Exception e) {
            log.warn("Could not read the QUOREICH license cache; online activation will be required");
        }
    }

    public synchronized LicensingState getLicensingState() {
        Instant now = Instant.now();
        if (!now.isBefore(lastAuthorityCheck.plusSeconds(12 * 60 * 60))) {
            lastAuthorityCheck = now;
            tryActivateOnline();
        }
        return stateFromCachedLease(now);
    }

    public boolean isActivationConfigured() {
        return authorityUrl != null && !authorityUrl.isBlank()
                && publicKeyPath != null && !publicKeyPath.isBlank()
                && cachePath != null && !cachePath.isBlank();
    }

    public synchronized LicensingState activate(String key) {
        if (!isActivationConfigured())
            throw new CustomException("L’activation des licences n’est pas configurée sur ce serveur.", HttpStatus.SERVICE_UNAVAILABLE);
        try {
            String fingerprint = fingerprintStore.getFingerprint();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            JsonNode response = http.postForObject(authorityUrl.replaceAll("/+$", "") + "/v1/activate",
                    new HttpEntity<>(Map.of("licenseKey", key.trim(), "fingerprint", fingerprint,
                            "environment", deploymentEnvironment), headers), JsonNode.class);
            if (response == null || !response.hasNonNull("lease"))
                throw new IllegalArgumentException("Missing signed lease");
            String lease = response.get("lease").asText();
            JsonNode claims = verifyLease(lease, fingerprint, Instant.now());
            long now = Instant.now().getEpochSecond();
            if (claims.path("startsAt").asLong(0) > now ||
                    (claims.hasNonNull("licenseExpiresAt") && claims.path("licenseExpiresAt").asLong(0) <= now))
                throw new IllegalArgumentException("License contract is not current");
            // A single atomic file keeps the key and signed lease together across restarts.
            persistActivation(key.trim(), lease);
            licenseKey = key.trim();
            cachedLease = lease;
            onlineRejected = false;
            lastAuthorityCheck = Instant.now();
            return stateFromCachedLease(Instant.now());
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            String message = switch (e.getStatusCode().value()) {
                case 403, 404 -> "Cette clé est inconnue, expirée ou révoquée.";
                case 409 -> "Cette licence est déjà utilisée sur une autre installation de cet environnement.";
                default -> "L’autorité a refusé l’activation. Réessayez ultérieurement.";
            };
            throw new CustomException(message, e.getStatusCode().value() == 409 ? HttpStatus.CONFLICT : HttpStatus.BAD_REQUEST);
        } catch (RestClientException e) {
            throw new CustomException("L’autorité de licences est indisponible. Réessayez ultérieurement.", HttpStatus.SERVICE_UNAVAILABLE);
        } catch (Exception e) {
            throw new CustomException("La licence n’a pas pu être vérifiée ou enregistrée. La licence précédente est conservée.", HttpStatus.BAD_REQUEST);
        }
    }

    private Path activationPath() {
        return Path.of(cachePath + ".activation.json");
    }

    private void persistActivation(String key, String lease) throws Exception {
        Path target = activationPath().toAbsolutePath();
        Files.createDirectories(target.getParent());
        Path temporary = Files.createTempFile(target.getParent(), ".activation-", ".tmp");
        try {
            try {
                Files.setPosixFilePermissions(temporary, EnumSet.of(PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_WRITE));
            } catch (UnsupportedOperationException ignored) { }
            Files.writeString(temporary, mapper.writeValueAsString(Map.of("licenseKey", key, "lease", lease)), StandardCharsets.UTF_8);
            Files.move(temporary, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        } finally {
            Files.deleteIfExists(temporary);
        }
    }

    private void tryActivateOnline() {
        if (authorityUrl == null || authorityUrl.isBlank() || licenseKey == null || licenseKey.isBlank()) return;
        try {
            String fingerprint = fingerprintStore.getFingerprint();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            Map<String, String> request = Map.of(
                    "licenseKey", licenseKey,
                    "fingerprint", fingerprint,
                    "environment", deploymentEnvironment
            );
            JsonNode response = http.postForObject(
                    authorityUrl.replaceAll("/+$", "") + "/v1/activate",
                    new HttpEntity<>(request, headers), JsonNode.class);
            if (response == null || !response.hasNonNull("lease")) {
                log.warn("QUOREICH license authority returned no lease");
                return;
            }
            String lease = response.get("lease").asText();
            verifyLease(lease, fingerprint, Instant.now());
            persistLease(lease);
            cachedLease = lease;
            onlineRejected = false;
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            int status = e.getStatusCode().value();
            if (status == 403 || status == 404 || status == 409) {
                // Keep an existing signed lease for audit/recovery, but honor the
                // authority's explicit revocation by moving the instance read-only.
                onlineRejected = cachedLease != null && !cachedLease.isBlank();
                log.warn("QUOREICH license activation was rejected (HTTP {})", status);
            } else {
                log.warn("QUOREICH license activation could not complete (HTTP {}); using a still-valid signed offline lease", status);
            }
        } catch (Exception e) {
            if (e instanceof RestClientException) {
                log.warn("QUOREICH license authority is unavailable; using a still-valid signed offline lease");
            } else {
                log.warn("Could not validate a response from the QUOREICH license authority");
            }
        }
    }

    private LicensingState stateFromCachedLease(Instant now) {
        if (cachedLease == null || cachedLease.isBlank()) return unlicensedState();
        try {
            String fingerprint = fingerprintStore.getFingerprint();
            JsonNode claims = verifyLease(cachedLease, fingerprint, now);
            long leaseExpiresAt = claims.path("exp").asLong(0);
            long licenseStartsAt = claims.path("startsAt").asLong(0);
            JsonNode licenseExpiryNode = claims.get("licenseExpiresAt");
            long licenseExpiresAt = licenseExpiryNode == null || licenseExpiryNode.isNull()
                    ? 0 : licenseExpiryNode.asLong(0);
            boolean leaseCurrent = now.getEpochSecond() < leaseExpiresAt;
            boolean contractCurrent = licenseExpiryNode == null || licenseExpiryNode.isNull()
                    || now.getEpochSecond() < licenseExpiresAt;
            boolean started = now.getEpochSecond() >= licenseStartsAt;
            boolean valid = leaseCurrent && contractCurrent && started && !onlineRejected;
            Set<String> entitlements = new HashSet<>();
            claims.path("entitlements").forEach(value -> entitlements.add(value.asText()));
            Date contractExpiry = licenseExpiryNode == null || licenseExpiryNode.isNull()
                    ? null : Date.from(Instant.ofEpochSecond(licenseExpiresAt));
            int fullSeats = claims.path("seatsFull").asInt(0);
            int lightSeats = claims.path("seatsLight").asInt(0);
            return LicensingState.builder()
                    .hasLicense(true)
                    .valid(valid)
                    .readOnly(!valid)
                    .previewMode(false)
                    .planName(claims.path("edition").asText("QUOREICH"))
                    .licenseId(claims.path("sub").asText(null))
                    .licenseType(claims.path("licenseType").asText(null))
                    .customerName(claims.path("customer").asText(null))
                    .environment(claims.path("environment").asText(null))
                    .seatsFull(fullSeats)
                    .seatsLight(lightSeats)
                    .usersCount(fullSeats + lightSeats)
                    .entitlements(entitlements)
                    .expirationDate(contractExpiry)
                    .leaseExpirationDate(Date.from(Instant.ofEpochSecond(leaseExpiresAt)))
                    .build();
        } catch (Exception e) {
            log.warn("Cached QUOREICH license lease is invalid; application is in read-only license state");
            return LicensingState.builder().hasLicense(true).valid(false).readOnly(true).build();
        }
    }

    private JsonNode verifyLease(String lease, String fingerprint, Instant now) throws Exception {
        String[] parts = lease.split("\\.", -1);
        if (parts.length != 3) throw new IllegalArgumentException("Malformed signed lease");
        JsonNode header = mapper.readTree(Base64.getUrlDecoder().decode(parts[0]));
        if (!"EdDSA".equals(header.path("alg").asText())) throw new IllegalArgumentException("Unexpected lease algorithm");
        Signature verifier = Signature.getInstance("Ed25519");
        verifier.initVerify(getPublicKey());
        verifier.update((parts[0] + "." + parts[1]).getBytes(StandardCharsets.US_ASCII));
        if (!verifier.verify(Base64.getUrlDecoder().decode(parts[2]))) throw new IllegalArgumentException("Invalid lease signature");
        JsonNode claims = mapper.readTree(Base64.getUrlDecoder().decode(parts[1]));
        if (!"QUOREICH GROUP License Authority".equals(claims.path("iss").asText()))
            throw new IllegalArgumentException("Unexpected lease issuer");
        if (!fingerprint.equalsIgnoreCase(claims.path("fingerprint").asText()))
            throw new IllegalArgumentException("Lease is bound to another installation");
        if (!deploymentEnvironment.equalsIgnoreCase(claims.path("environment").asText()))
            throw new IllegalArgumentException("Lease is bound to another deployment environment");
        if (claims.path("exp").asLong(0) <= now.getEpochSecond())
            throw new IllegalArgumentException("Offline license lease has expired");
        return claims;
    }

    private PublicKey getPublicKey() throws Exception {
        if (publicKey != null) return publicKey;
        if (publicKeyPath == null || publicKeyPath.isBlank()) throw new IllegalStateException("License public key path is not configured");
        String pem = Files.readString(Path.of(publicKeyPath));
        String encoded = pem.replaceAll("-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\\s", "");
        publicKey = KeyFactory.getInstance("Ed25519").generatePublic(
                new X509EncodedKeySpec(Base64.getDecoder().decode(encoded)));
        return publicKey;
    }

    private void persistLease(String lease) throws Exception {
        if (cachePath == null || cachePath.isBlank()) return;
        if (Files.isRegularFile(activationPath())) {
            persistActivation(licenseKey, lease);
            return;
        }
        Path path = Path.of(cachePath);
        Files.createDirectories(path.getParent());
        Files.writeString(path, lease, StandardCharsets.US_ASCII);
        try {
            Files.setPosixFilePermissions(path, EnumSet.of(PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_WRITE));
        } catch (UnsupportedOperationException ignored) {
            // POSIX permissions are unavailable on some supported filesystems.
        }
    }

    private static LicensingState unlicensedState() {
        return LicensingState.builder().hasLicense(false).valid(false).readOnly(false).build();
    }
}
