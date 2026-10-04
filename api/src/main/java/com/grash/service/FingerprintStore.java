package com.grash.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.security.MessageDigest;
import java.util.EnumSet;
import java.util.HexFormat;
import java.util.UUID;

@Component
public class FingerprintStore {
    @Value("${license-fingerprint:}")
    private String configuredFingerprint;
    @Value("${license-fingerprint-path:/app/license-cache/instance-id}")
    private String fingerprintPath;

    public synchronized String getFingerprint() throws Exception {
        if (configuredFingerprint != null && !configuredFingerprint.isBlank()) {
            if (!configuredFingerprint.matches("[a-fA-F0-9]{64}"))
                throw new IllegalStateException("LICENSE_FINGERPRINT must be a 64-character hex value");
            return configuredFingerprint.toLowerCase();
        }
        Path path = Path.of(fingerprintPath);
        Files.createDirectories(path.getParent());
        String identity;
        if (Files.isRegularFile(path)) {
            identity = Files.readString(path).trim();
        } else {
            identity = UUID.randomUUID().toString();
            Files.writeString(path, identity, StandardCharsets.US_ASCII);
            try {
                Files.setPosixFilePermissions(path, EnumSet.of(PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_WRITE));
            } catch (UnsupportedOperationException ignored) {
                // POSIX permissions are unavailable on some supported filesystems.
            }
        }
        byte[] hash = MessageDigest.getInstance("SHA-256").digest(identity.getBytes(StandardCharsets.US_ASCII));
        return HexFormat.of().formatHex(hash);
    }
}
