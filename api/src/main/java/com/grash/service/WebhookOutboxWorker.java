package com.grash.service;

import com.grash.model.WebhookOutboxEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebhookOutboxWorker {
    private final WebhookOutboxService outboxService;
    private final WebhookDispatchService dispatchService;

    @Scheduled(fixedDelayString = "${webhook.outbox.poll-delay-ms:10000}")
    public void dispatchDueEvents() {
        for (Long id : outboxService.claimBatch()) {
            try {
                WebhookOutboxEvent event = outboxService.find(id);
                dispatchService.dispatchOutboxEvent(event);
                outboxService.delivered(id);
            } catch (RuntimeException failure) {
                outboxService.failed(id, failure);
                log.warn("Webhook outbox event delivery failed (outboxId={}, cause={})", id,
                        failure.getClass().getSimpleName());
            }
        }
    }
}
