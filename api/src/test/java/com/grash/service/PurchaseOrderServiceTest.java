package com.grash.service;

import com.grash.model.PurchaseOrder;
import com.grash.model.enums.ApprovalStatus;
import com.grash.repository.PurchaseOrderRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PurchaseOrderServiceTest {

    @InjectMocks
    private PurchaseOrderService purchaseOrderService;
    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;
    @Mock
    private EntityManager em;
    @Mock
    private PurchaseOrderWebhookService purchaseOrderWebhookService;

    @Test
    void create_ignoresClientIdSoAnExistingOrderIsNeverOverwritten() {
        PurchaseOrder request = new PurchaseOrder();
        request.setId(42L);
        request.setName("PO-1");
        request.setStatus(ApprovalStatus.APPROVED);
        when(purchaseOrderRepository.saveAndFlush(request)).thenReturn(request);

        purchaseOrderService.create(request);

        assertNull(request.getId());
        assertEquals(ApprovalStatus.PENDING, request.getStatus());
    }
}
