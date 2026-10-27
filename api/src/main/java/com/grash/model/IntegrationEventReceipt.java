package com.grash.model;

import com.grash.model.abstracts.CompanyAudit;
import com.grash.model.enums.IntegrationEventStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Temporal;
import jakarta.persistence.TemporalType;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Date;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "integration_event_receipt",
        uniqueConstraints = @UniqueConstraint(name = "uk_integration_event_receipt_idempotency",
                columnNames = {"company_id", "provider_key", "idempotency_key"}),
        indexes = {
                @Index(name = "idx_integration_event_receipt_state",
                        columnList = "company_id, provider_key, status, received_at"),
                @Index(name = "idx_integration_event_receipt_recovery",
                        columnList = "company_id, provider_key, status, last_attempt_at")
        })
public class IntegrationEventReceipt extends CompanyAudit {
    @Column(name = "provider_key", nullable = false, length = 80)
    private String providerKey;

    @Column(name = "idempotency_key", nullable = false, length = 255)
    private String idempotencyKey;

    @Column(name = "event_type", nullable = false, length = 120)
    private String eventType;

    @Column(name = "payload_sha256", nullable = false, length = 64)
    private String payloadSha256;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 24)
    private IntegrationEventStatus status;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "received_at", nullable = false, updatable = false)
    private Date receivedAt;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "last_attempt_at", nullable = false)
    private Date lastAttemptAt;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "processed_at")
    private Date processedAt;

    @Column(name = "last_error_code", length = 100)
    private String lastErrorCode;
}
