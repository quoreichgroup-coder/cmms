package com.grash.service;

import com.grash.model.Company;
import com.grash.model.PurchaseOrder;
import com.grash.model.PurchaseOrderCategory;
import com.grash.model.Vendor;
import com.grash.model.enums.ApprovalStatus;
import com.grash.model.enums.webhook.WebhookEvent;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.Mock;

import java.util.Map;

import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class PurchaseOrderWebhookServiceTest {

    @Mock private WebhookOutboxService outboxService;

    @Test
    void newPurchaseOrderEventUsesSafeSnapshotAndStablePayload() {
        PurchaseOrderWebhookService service = new PurchaseOrderWebhookService(outboxService);
        PurchaseOrder order = order();

        service.created(order);

        verify(outboxService).enqueue(eq(2L), eq(WebhookEvent.NEW_PURCHASE_ORDER),
                eq(Map.of("purchaseOrderId", 12L, "purchaseOrderNumber", "PO-12", "status", "PENDING")),
                eq(Map.of("id", 12L, "number", "PO-12", "status", "PENDING",
                        "vendorId", 7L, "categoryId", 3L)));
    }

    @Test
    void changeEventIsPersistedInOutbox() {
        PurchaseOrderWebhookService service = new PurchaseOrderWebhookService(outboxService);
        service.changed(order());

        verify(outboxService).enqueue(eq(2L), eq(WebhookEvent.PURCHASE_ORDER_CHANGE), anyMap(), anyMap());
    }

    @Test
    void statusEventIncludesPreviousAndFinalStatus() {
        PurchaseOrderWebhookService service = new PurchaseOrderWebhookService(outboxService);
        PurchaseOrder order = order();
        order.setStatus(ApprovalStatus.APPROVED);

        service.statusChanged(order, ApprovalStatus.PENDING);

        verify(outboxService).enqueue(eq(2L), eq(WebhookEvent.PURCHASE_ORDER_STATUS_CHANGE),
                eq(Map.of("purchaseOrderId", 12L, "purchaseOrderNumber", "PO-12",
                        "previousStatus", "PENDING", "status", "APPROVED")),
                eq(Map.of("id", 12L, "number", "PO-12", "status", "APPROVED",
                        "vendorId", 7L, "categoryId", 3L)));
    }

    private PurchaseOrder order() {
        Company company = new Company();
        company.setId(2L);
        Vendor vendor = new Vendor();
        vendor.setId(7L);
        PurchaseOrderCategory category = new PurchaseOrderCategory();
        category.setId(3L);
        PurchaseOrder order = new PurchaseOrder();
        order.setId(12L);
        order.setName("PO-12");
        order.setStatus(ApprovalStatus.PENDING);
        order.setCompany(company);
        order.setVendor(vendor);
        order.setCategory(category);
        return order;
    }
}
