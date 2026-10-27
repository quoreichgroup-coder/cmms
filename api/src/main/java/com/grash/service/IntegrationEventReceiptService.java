package com.grash.service;

import com.grash.exception.CustomException;
import com.grash.model.IntegrationEventReceipt;
import com.grash.model.enums.IntegrationEventStatus;
import com.grash.repository.IntegrationEventReceiptRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.Locale;
import java.util.List;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class IntegrationEventReceiptService {
    private static final Pattern SHA_256 = Pattern.compile("[0-9a-fA-F]{64}");
    private static final Pattern SAFE_ERROR_CODE = Pattern.compile("[A-Za-z0-9_.-]{1,100}");

    private final IntegrationEventReceiptRepository receiptRepository;
    private final IntegrationEventReceiptWriter receiptWriter;

    public record Claim(IntegrationEventReceipt receipt, boolean mayProcess) {}

    /**
     * Returns a bounded candidate batch for an internal recovery worker. Candidates must still be
     * reclaimed individually because another worker may claim them after this read.
     */
    @Transactional(readOnly = true)
    public List<IntegrationEventReceipt> findStaleProcessing(Long companyId, String providerKey,
                                                             Date staleBefore, int limit) {
        String provider = normalize(providerKey, "providerKey", 80).toUpperCase(Locale.ROOT);
        Date now = new Date();
        if (staleBefore == null || staleBefore.after(now)) {
            throw new CustomException("A valid processing lease cutoff is required", HttpStatus.BAD_REQUEST);
        }
        if (limit < 1 || limit > 100) {
            throw new CustomException("Recovery batch size must be between 1 and 100", HttpStatus.BAD_REQUEST);
        }
        return receiptRepository
                .findByCompany_IdAndProviderKeyAndStatusAndLastAttemptAtBeforeOrderByLastAttemptAtAsc(
                        companyId, provider, IntegrationEventStatus.PROCESSING, staleBefore,
                        PageRequest.of(0, limit));
    }

    /**
     * Claims an inbound event once per company/provider/idempotency key. Failed events may be retried;
     * processing or completed events are returned without authorizing duplicate work.
     */
    @Transactional
    public Claim claim(Long companyId, String providerKey, String idempotencyKey,
                       String eventType, String payloadSha256) {
        String provider = normalize(providerKey, "providerKey", 80).toUpperCase(Locale.ROOT);
        String key = normalize(idempotencyKey, "idempotencyKey", 255);
        String type = normalize(eventType, "eventType", 120).toUpperCase(Locale.ROOT);
        if (payloadSha256 == null || !SHA_256.matcher(payloadSha256).matches()) {
            throw new CustomException("A SHA-256 payload digest is required", HttpStatus.BAD_REQUEST);
        }
        String digest = payloadSha256.toLowerCase(Locale.ROOT);
        Date now = new Date();

        var existing = receiptRepository.findByCompanyAndProviderAndIdempotencyKeyForUpdate(
                companyId, provider, key);
        if (existing.isPresent()) return claimExisting(existing.get(), type, digest, now);

        try {
            return new Claim(receiptWriter.insert(companyId, provider, key, type, digest, now), true);
        } catch (DataIntegrityViolationException concurrentInsert) {
            // A concurrent importer may have won the unique company/provider/key constraint.
            // Its insert is isolated in REQUIRES_NEW so this transaction can safely read it.
            return receiptRepository.findByCompanyAndProviderAndIdempotencyKeyForUpdate(
                            companyId, provider, key)
                    .map(winner -> claimExisting(winner, type, digest, now))
                    .orElseThrow(() -> concurrentInsert);
        }
    }

    private Claim claimExisting(IntegrationEventReceipt receipt, String eventType, String digest, Date now) {
        if (!receipt.getEventType().equals(eventType) || !receipt.getPayloadSha256().equals(digest)) {
            throw new CustomException("Idempotency key was already used for a different event",
                    HttpStatus.CONFLICT);
        }
        if (receipt.getStatus() != IntegrationEventStatus.FAILED) return new Claim(receipt, false);

        receipt.setStatus(IntegrationEventStatus.PROCESSING);
        receipt.setAttemptCount(receipt.getAttemptCount() + 1);
        receipt.setLastAttemptAt(now);
        receipt.setLastErrorCode(null);
        receipt.setProcessedAt(null);
        return new Claim(receiptRepository.saveAndFlush(receipt), true);
    }

    /**
     * Reclaims a PROCESSING receipt only when its last attempt predates the caller's lease cutoff.
     * The caller owns the lease duration policy; the row lock and refreshed timestamp ensure only
     * one concurrent recovery attempt can acquire the stale receipt.
     */
    @Transactional
    public Claim reclaimStaleProcessing(Long companyId, String providerKey, String idempotencyKey,
                                        String eventType, String payloadSha256, Date staleBefore) {
        String provider = normalize(providerKey, "providerKey", 80).toUpperCase(Locale.ROOT);
        String key = normalize(idempotencyKey, "idempotencyKey", 255);
        String type = normalize(eventType, "eventType", 120).toUpperCase(Locale.ROOT);
        Date now = new Date();
        if (staleBefore == null || staleBefore.after(now)) {
            throw new CustomException("A valid processing lease cutoff is required", HttpStatus.BAD_REQUEST);
        }
        if (payloadSha256 == null || !SHA_256.matcher(payloadSha256).matches()) {
            throw new CustomException("A SHA-256 payload digest is required", HttpStatus.BAD_REQUEST);
        }
        String digest = payloadSha256.toLowerCase(Locale.ROOT);
        IntegrationEventReceipt receipt = receiptRepository
                .findByCompanyAndProviderAndIdempotencyKeyForUpdate(companyId, provider, key)
                .orElseThrow(() -> new CustomException("Integration event not found", HttpStatus.NOT_FOUND));
        if (!receipt.getEventType().equals(type) || !receipt.getPayloadSha256().equals(digest)) {
            throw new CustomException("Idempotency key was already used for a different event",
                    HttpStatus.CONFLICT);
        }
        if (receipt.getStatus() != IntegrationEventStatus.PROCESSING
                || receipt.getLastAttemptAt() == null
                || !receipt.getLastAttemptAt().before(staleBefore)) {
            return new Claim(receipt, false);
        }

        receipt.setAttemptCount(receipt.getAttemptCount() + 1);
        receipt.setLastAttemptAt(now);
        receipt.setLastErrorCode(null);
        receipt.setProcessedAt(null);
        return new Claim(receiptRepository.saveAndFlush(receipt), true);
    }

    @Transactional
    public IntegrationEventReceipt markProcessed(Long id, Long companyId, int claimedAttempt) {
        IntegrationEventReceipt receipt = getProcessingReceipt(id, companyId, claimedAttempt);
        receipt.setStatus(IntegrationEventStatus.PROCESSED);
        receipt.setProcessedAt(new Date());
        receipt.setLastErrorCode(null);
        return receiptRepository.saveAndFlush(receipt);
    }

    @Transactional
    public IntegrationEventReceipt markFailed(Long id, Long companyId, int claimedAttempt, String errorCode) {
        IntegrationEventReceipt receipt = getProcessingReceipt(id, companyId, claimedAttempt);
        receipt.setStatus(IntegrationEventStatus.FAILED);
        receipt.setProcessedAt(null);
        receipt.setLastErrorCode(normalizeErrorCode(errorCode));
        return receiptRepository.saveAndFlush(receipt);
    }

    private IntegrationEventReceipt getProcessingReceipt(Long id, Long companyId, int claimedAttempt) {
        IntegrationEventReceipt receipt = receiptRepository.findByIdAndCompanyForUpdate(id, companyId)
                .orElseThrow(() -> new CustomException("Integration event not found", HttpStatus.NOT_FOUND));
        if (receipt.getStatus() != IntegrationEventStatus.PROCESSING
                || receipt.getAttemptCount() != claimedAttempt) {
            throw new CustomException("Integration event is not processing", HttpStatus.CONFLICT);
        }
        return receipt;
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

    private String normalizeErrorCode(String errorCode) {
        if (errorCode == null || errorCode.isBlank()) {
            return null;
        }
        String normalized = errorCode.trim();
        if (!SAFE_ERROR_CODE.matcher(normalized).matches()) {
            throw new CustomException("errorCode must be a short code without message details", HttpStatus.BAD_REQUEST);
        }
        return normalized.toUpperCase(Locale.ROOT);
    }
}
