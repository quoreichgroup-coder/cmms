package com.grash.service;

import com.grash.exception.CustomException;
import com.grash.model.IntegrationObjectReference;
import com.grash.repository.IntegrationObjectReferenceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class IntegrationObjectReferenceService {
    private final IntegrationObjectReferenceRepository referenceRepository;
    private final IntegrationObjectReferenceWriter referenceWriter;
    @Transactional(readOnly = true)
    public IntegrationObjectReference find(Long companyId, String providerKey, String objectType, String externalId) {
        return referenceRepository.findByCompany_IdAndProviderKeyAndObjectTypeAndExternalId(
                        companyId, normalizeKey(providerKey, "providerKey", 80),
                        normalizeKey(objectType, "objectType", 80), normalize(externalId, "externalId", 255))
                .orElseThrow(() -> new CustomException("Integration reference not found", HttpStatus.NOT_FOUND));
    }

    /** Registers a stable external-to-QPM mapping. Repeating the same mapping is safe; rebinding is rejected. */
    @Transactional
    public IntegrationObjectReference register(Long companyId, String providerKey, String objectType,
                                               String externalId, String localObjectId) {
        String provider = normalizeKey(providerKey, "providerKey", 80);
        String type = normalizeKey(objectType, "objectType", 80);
        String external = normalize(externalId, "externalId", 255);
        String local = normalize(localObjectId, "localObjectId", 100);

        return referenceRepository.findByCompany_IdAndProviderKeyAndObjectTypeAndExternalId(
                        companyId, provider, type, external)
                .map(existing -> {
                    if (!existing.getLocalObjectId().equals(local)) {
                        throw new CustomException("External reference is already bound to another QPM object",
                                HttpStatus.CONFLICT);
                    }
                    return existing;
                })
                .orElseGet(() -> registerAfterInitialLookup(
                        companyId, provider, type, external, local));
    }

    private IntegrationObjectReference registerAfterInitialLookup(Long companyId, String provider,
                                                                   String type, String external,
                                                                   String local) {
        try {
            return referenceWriter.insert(companyId, provider, type, external, local);
        } catch (DataIntegrityViolationException concurrentInsert) {
            // The unique company/provider/type/external key decides the winner; read it after
            // the independent insert transaction has rolled back before returning a conflict.
            return referenceRepository.findByCompany_IdAndProviderKeyAndObjectTypeAndExternalId(
                            companyId, provider, type, external)
                    .map(existing -> {
                        if (!existing.getLocalObjectId().equals(local)) {
                            throw new CustomException(
                                    "External reference is already bound to another QPM object",
                                    HttpStatus.CONFLICT);
                        }
                        return existing;
                    })
                    .orElseThrow(() -> concurrentInsert);
        }
    }

    private String normalize(String value, String field, int maxLength) {
        if (value == null || value.isBlank()) {
            throw new CustomException(field + " is required", HttpStatus.BAD_REQUEST);
        }
        String normalized = value.trim();
        if (normalized.length() > maxLength) {
            throw new CustomException(field + " exceeds maximum length", HttpStatus.BAD_REQUEST);
        }
        return normalized;
    }

    private String normalizeKey(String value, String field, int maxLength) {
        return normalize(value, field, maxLength).toUpperCase(Locale.ROOT);
    }
}
