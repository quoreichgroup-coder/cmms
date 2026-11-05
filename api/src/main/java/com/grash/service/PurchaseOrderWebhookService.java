package com.grash.service;

import com.grash.model.Company;
import com.grash.model.PurchaseOrder;
import com.grash.model.enums.ApprovalStatus;
import com.grash.model.enums.webhook.WebhookEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/** Publishes the stable, non-sensitive PO webhook contract after the owning transaction commits. */
@Service
@RequiredArgsConstructor
public class PurchaseOrderWebhookService {

    private final WebhookOutboxService outboxService;

    public void created(PurchaseOrder order) {
        Map<String, Object> snapshot = snapshot(order);
        publish(order.getCompany(), WebhookEvent.NEW_PURCHASE_ORDER,
                Map.of("purchaseOrderId", order.getId(), "purchaseOrderNumber", order.getName(),
                        "status", order.getStatus().name()), snapshot);
    }

    public void changed(PurchaseOrder order) {
        Map<String, Object> snapshot = snapshot(order);
        publish(order.getCompany(), WebhookEvent.PURCHASE_ORDER_CHANGE,
                Map.of("purchaseOrderId", order.getId(), "purchaseOrderNumber", order.getName(),
                        "status", order.getStatus().name()), snapshot);
    }

    public void statusChanged(PurchaseOrder order, ApprovalStatus previousStatus) {
        Map<String, Object> snapshot = snapshot(order);
        publish(order.getCompany(), WebhookEvent.PURCHASE_ORDER_STATUS_CHANGE,
                Map.of("purchaseOrderId", order.getId(), "purchaseOrderNumber", order.getName(),
                        "previousStatus", previousStatus.name(), "status", order.getStatus().name()), snapshot);
    }

    private Map<String, Object> snapshot(PurchaseOrder order) {
        Map<String, Object> snapshot = new HashMap<>();
        snapshot.put("id", order.getId());
        snapshot.put("number", order.getName());
        snapshot.put("status", order.getStatus().name());
        snapshot.put("vendorId", order.getVendor() == null ? null : order.getVendor().getId());
        snapshot.put("categoryId", order.getCategory() == null ? null : order.getCategory().getId());
        return snapshot;
    }

    private void publish(Company company, WebhookEvent event, Map<String, Object> payload,
                         Map<String, Object> snapshot) {
        outboxService.enqueue(company.getId(), event, payload, snapshot);
    }
}
