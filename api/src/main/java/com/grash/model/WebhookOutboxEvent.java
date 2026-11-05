package com.grash.model;

import com.grash.model.enums.webhook.WebhookEvent;
import com.grash.model.enums.webhook.WebhookOutboxStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.Date;
import java.util.UUID;

@Entity
@Table(name = "webhook_outbox_event", indexes = {
        @Index(name = "idx_webhook_outbox_due", columnList = "status,next_attempt_at,created_at"),
        @Index(name = "idx_webhook_outbox_claimed", columnList = "status,claimed_at"),
        @Index(name = "idx_webhook_outbox_company", columnList = "company_id,created_at")
})
@Getter
@Setter
public class WebhookOutboxEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_key", nullable = false, unique = true, updatable = false)
    private UUID eventKey;

    @Column(name = "company_id", nullable = false, updatable = false)
    private Long companyId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, updatable = false, length = 64)
    private WebhookEvent eventType;

    @Column(name = "payload", nullable = false, columnDefinition = "TEXT", updatable = false)
    private String payload;

    @Column(name = "serialized_payload", nullable = false, columnDefinition = "TEXT", updatable = false)
    private String serializedPayload;

    @Column(name = "endpoint_ids", nullable = false, columnDefinition = "TEXT", updatable = false)
    private String endpointIds;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private WebhookOutboxStatus status = WebhookOutboxStatus.PENDING;

    @Column(nullable = false)
    private int attempts;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "created_at", nullable = false, updatable = false)
    private Date createdAt;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "next_attempt_at", nullable = false)
    private Date nextAttemptAt;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "claimed_at")
    private Date claimedAt;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "delivered_at")
    private Date deliveredAt;

    @Column(name = "last_error", length = 128)
    private String lastError;
}
