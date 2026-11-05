package com.grash.dto.webhookEndpoint;

import lombok.Builder;

import java.util.Date;

@Builder
public record WebhookOutboxDeadLetterDTO(
        Long id,
        String eventType,
        int attempts,
        Date createdAt,
        String lastError
) {
}
