package com.grash.service;

import com.grash.model.WebhookOutboxEvent;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WebhookOutboxWorkerTest {
    @Mock private WebhookOutboxService outboxService;
    @Mock private WebhookDispatchService dispatchService;

    @Test
    void workerMarksSuccessfullyDispatchedEventDelivered() {
        WebhookOutboxWorker worker = new WebhookOutboxWorker(outboxService, dispatchService);
        WebhookOutboxEvent event = new WebhookOutboxEvent();
        when(outboxService.claimBatch()).thenReturn(List.of(11L));
        when(outboxService.find(11L)).thenReturn(event);

        worker.dispatchDueEvents();

        verify(dispatchService).dispatchOutboxEvent(event);
        verify(outboxService).delivered(11L);
        verify(outboxService, never()).failed(anyLong(), any());
    }

    @Test
    void workerPersistsRetryAfterDeliveryFailure() {
        WebhookOutboxWorker worker = new WebhookOutboxWorker(outboxService, dispatchService);
        WebhookOutboxEvent event = new WebhookOutboxEvent();
        IllegalStateException failure = new IllegalStateException("network down");
        when(outboxService.claimBatch()).thenReturn(List.of(12L));
        when(outboxService.find(12L)).thenReturn(event);
        doThrow(failure).when(dispatchService).dispatchOutboxEvent(event);

        worker.dispatchDueEvents();

        verify(outboxService).failed(12L, failure);
        verify(outboxService, never()).delivered(12L);
    }
}
