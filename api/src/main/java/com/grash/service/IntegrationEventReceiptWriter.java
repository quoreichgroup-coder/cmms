package com.grash.service;

import com.grash.exception.CustomException;
import com.grash.model.Company;
import com.grash.model.IntegrationEventReceipt;
import com.grash.model.enums.IntegrationEventStatus;
import com.grash.repository.IntegrationEventReceiptRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;

/** Isolates a receipt insert so a concurrent idempotency-key collision does not poison its caller. */
@Service
@RequiredArgsConstructor
public class IntegrationEventReceiptWriter {
    private final IntegrationEventReceiptRepository receiptRepository;
    private final CompanyService companyService;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public IntegrationEventReceipt insert(Long companyId, String providerKey, String idempotencyKey,
                                          String eventType, String payloadSha256, Date receivedAt) {
        Company company = companyService.findById(companyId)
                .orElseThrow(() -> new CustomException("Company not found", HttpStatus.NOT_FOUND));
        IntegrationEventReceipt receipt = new IntegrationEventReceipt();
        receipt.setCompany(company);
        receipt.setProviderKey(providerKey);
        receipt.setIdempotencyKey(idempotencyKey);
        receipt.setEventType(eventType);
        receipt.setPayloadSha256(payloadSha256);
        receipt.setStatus(IntegrationEventStatus.PROCESSING);
        receipt.setAttemptCount(1);
        receipt.setReceivedAt(receivedAt);
        receipt.setLastAttemptAt(receivedAt);
        return receiptRepository.saveAndFlush(receipt);
    }
}
