package com.grash.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.grash.model.WebhookOutboxEvent;
import com.grash.model.enums.webhook.WebhookEvent;
import com.grash.model.enums.webhook.WebhookOutboxStatus;
import com.grash.repository.WebhookOutboxEventRepository;
import com.grash.repository.WebhookEndpointRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WebhookOutboxService {
    private static final int MAX_ATTEMPTS = 8;
    private static final Duration CLAIM_LEASE = Duration.ofMinutes(5);

    private final WebhookOutboxEventRepository repository;
    private final WebhookEndpointRepository endpointRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public Long enqueue(Long companyId, WebhookEvent event, Map<String, Object> payload,
                       Map<String, Object> serializedPayload) {
        WebhookOutboxEvent outboxEvent = new WebhookOutboxEvent();
        List<Long> endpointIds = endpointRepository.findByCompanyIdAndEnabled(companyId, true).stream()
                .filter(endpoint -> endpoint.getEvent() == event)
                .map(endpoint -> endpoint.getId())
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        if (endpointIds.isEmpty()) return null;
        Date now = new Date();
        outboxEvent.setEventKey(UUID.randomUUID());
        outboxEvent.setCompanyId(companyId);
        outboxEvent.setEventType(event);
        outboxEvent.setPayload(write(payload));
        outboxEvent.setSerializedPayload(write(serializedPayload));
        outboxEvent.setEndpointIds(write(endpointIds));
        outboxEvent.setStatus(WebhookOutboxStatus.PENDING);
        outboxEvent.setAttempts(0);
        outboxEvent.setCreatedAt(now);
        outboxEvent.setNextAttemptAt(now);
        return repository.save(outboxEvent).getId();
    }

    @Transactional
    public List<Long> claimBatch() {
        Date now = new Date();
        Date staleBefore = Date.from(now.toInstant().minus(CLAIM_LEASE));
        List<WebhookOutboxEvent> due = new ArrayList<>(repository.claimDue(now, staleBefore));
        due.removeIf(event -> {
            if (event.getStatus() == WebhookOutboxStatus.PROCESSING) {
                int attempts = event.getAttempts() + 1;
                event.setAttempts(attempts);
                event.setLastError("WorkerLeaseExpired");
                if (attempts >= MAX_ATTEMPTS) {
                    event.setStatus(WebhookOutboxStatus.DEAD);
                    event.setClaimedAt(null);
                    return true;
                }
            }
            event.setStatus(WebhookOutboxStatus.PROCESSING);
            event.setClaimedAt(now);
            return false;
        });
        return due.stream().map(WebhookOutboxEvent::getId).toList();
    }

    @Transactional(readOnly = true)
    public WebhookOutboxEvent find(Long id) {
        return repository.findById(id).orElseThrow();
    }

    @Transactional
    public void delivered(Long id) {
        repository.findById(id).ifPresent(event -> {
            if (event.getStatus() != WebhookOutboxStatus.PROCESSING) return;
            event.setStatus(WebhookOutboxStatus.DELIVERED);
            event.setDeliveredAt(new Date());
            event.setClaimedAt(null);
            event.setLastError(null);
        });
    }

    @Transactional
    public void failed(Long id, Throwable failure) {
        repository.findById(id).ifPresent(event -> {
            if (event.getStatus() != WebhookOutboxStatus.PROCESSING) return;
            int attempts = event.getAttempts() + 1;
            event.setAttempts(attempts);
            event.setClaimedAt(null);
            event.setLastError(failure.getClass().getSimpleName());
            if (attempts >= MAX_ATTEMPTS) {
                event.setStatus(WebhookOutboxStatus.DEAD);
            } else {
                event.setStatus(WebhookOutboxStatus.PENDING);
                long delaySeconds = Math.min(21_600L, 30L << Math.min(attempts - 1, 9));
                event.setNextAttemptAt(Date.from(new Date().toInstant().plusSeconds(delaySeconds)));
            }
        });
    }

    private String write(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Webhook outbox payload could not be serialized", exception);
        }
    }

}
