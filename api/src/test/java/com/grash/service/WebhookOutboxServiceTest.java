package com.grash.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.grash.model.WebhookOutboxEvent;
import com.grash.model.WebhookEndpoint;
import com.grash.model.enums.webhook.WebhookEvent;
import com.grash.model.enums.webhook.WebhookOutboxStatus;
import com.grash.repository.WebhookOutboxEventRepository;
import com.grash.repository.WebhookEndpointRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WebhookOutboxServiceTest {
    @Mock private WebhookOutboxEventRepository repository;
    @Mock private WebhookEndpointRepository endpointRepository;

    private WebhookOutboxService service() {
        return new WebhookOutboxService(repository, endpointRepository, new ObjectMapper());
    }

    @Test
    void enqueueSerializesPayloadAndCreatesStablePendingEvent() throws Exception {
        when(repository.save(any())).thenAnswer(invocation -> {
            WebhookOutboxEvent event = invocation.getArgument(0);
            event.setId(4L);
            return event;
        });
        WebhookEndpoint endpoint = new WebhookEndpoint();
        endpoint.setId(16L);
        endpoint.setEvent(WebhookEvent.NEW_PURCHASE_ORDER);
        when(endpointRepository.findByCompanyIdAndEnabled(9L, true)).thenReturn(List.of(endpoint));
        WebhookOutboxService service = service();

        Long id = service.enqueue(9L, WebhookEvent.NEW_PURCHASE_ORDER,
                Map.of("purchaseOrderId", 12L), Map.of("id", 12L));

        assertEquals(4L, id);
        var captor = org.mockito.ArgumentCaptor.forClass(WebhookOutboxEvent.class);
        verify(repository).save(captor.capture());
        WebhookOutboxEvent saved = captor.getValue();
        assertEquals(9L, saved.getCompanyId());
        assertEquals(WebhookEvent.NEW_PURCHASE_ORDER, saved.getEventType());
        assertEquals(WebhookOutboxStatus.PENDING, saved.getStatus());
        assertEquals(0, saved.getAttempts());
        assertNotNull(saved.getEventKey());
        assertEquals("[16]", saved.getEndpointIds());
        assertEquals(12, new ObjectMapper().readTree(saved.getPayload()).get("purchaseOrderId").asInt());
    }

    @Test
    void claimBatchMarksDueEventsAndReturnsIds() {
        WebhookOutboxEvent due = new WebhookOutboxEvent();
        due.setId(7L);
        due.setStatus(WebhookOutboxStatus.PENDING);
        when(repository.claimDue(any(Date.class), any(Date.class))).thenReturn(List.of(due));

        assertEquals(List.of(7L), service().claimBatch());

        assertEquals(WebhookOutboxStatus.PROCESSING, due.getStatus());
        assertNotNull(due.getClaimedAt());
    }

    @Test
    void reclaimingExpiredWorkerLeaseConsumesAnAttempt() {
        WebhookOutboxEvent stale = processingEvent();
        when(repository.claimDue(any(Date.class), any(Date.class))).thenReturn(new java.util.ArrayList<>(List.of(stale)));

        assertEquals(List.of(8L), service().claimBatch());

        assertEquals(1, stale.getAttempts());
        assertEquals("WorkerLeaseExpired", stale.getLastError());
        assertEquals(WebhookOutboxStatus.PROCESSING, stale.getStatus());
    }

    @Test
    void repeatedExpiredWorkerLeasesAreDeadLettered() {
        WebhookOutboxEvent stale = processingEvent();
        stale.setAttempts(7);
        when(repository.claimDue(any(Date.class), any(Date.class))).thenReturn(new java.util.ArrayList<>(List.of(stale)));

        assertTrue(service().claimBatch().isEmpty());

        assertEquals(8, stale.getAttempts());
        assertEquals(WebhookOutboxStatus.DEAD, stale.getStatus());
        assertNull(stale.getClaimedAt());
    }

    @Test
    void failureSchedulesExponentialRetryWithoutPersistingSensitiveExceptionText() {
        WebhookOutboxEvent event = processingEvent();
        when(repository.findById(8L)).thenReturn(java.util.Optional.of(event));
        RuntimeException failure = new RuntimeException("secret token in webhook URL");

        service().failed(8L, failure);

        assertEquals(WebhookOutboxStatus.PENDING, event.getStatus());
        assertEquals(1, event.getAttempts());
        assertEquals("RuntimeException", event.getLastError());
        assertTrue(event.getNextAttemptAt().after(new Date(System.currentTimeMillis() + 25_000)));
        assertTrue(event.getNextAttemptAt().before(new Date(System.currentTimeMillis() + 40_000)));
    }

    @Test
    void exhaustedEventMovesToDeadLetterState() {
        WebhookOutboxEvent event = processingEvent();
        event.setAttempts(7);
        when(repository.findById(8L)).thenReturn(java.util.Optional.of(event));

        service().failed(8L, new IllegalStateException());

        assertEquals(WebhookOutboxStatus.DEAD, event.getStatus());
        assertEquals(8, event.getAttempts());
        assertNull(event.getClaimedAt());
    }

    @Test
    void successfulEventRecordsDeliveryTime() {
        WebhookOutboxEvent event = processingEvent();
        when(repository.findById(8L)).thenReturn(java.util.Optional.of(event));

        service().delivered(8L);

        assertEquals(WebhookOutboxStatus.DELIVERED, event.getStatus());
        assertNotNull(event.getDeliveredAt());
        assertNull(event.getClaimedAt());
    }

    private WebhookOutboxEvent processingEvent() {
        WebhookOutboxEvent event = new WebhookOutboxEvent();
        event.setId(8L);
        event.setEventKey(UUID.randomUUID());
        event.setStatus(WebhookOutboxStatus.PROCESSING);
        event.setClaimedAt(new Date());
        return event;
    }
}
