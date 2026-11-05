package com.grash.service;

import com.grash.dto.PurchaseOrderReceiptRequest;
import com.grash.exception.CustomException;
import com.grash.mapper.PartMapper;
import com.grash.model.Part;
import com.grash.model.PartQuantity;
import com.grash.model.PurchaseOrder;
import com.grash.model.enums.ApprovalStatus;
import com.grash.repository.PartRepository;
import com.grash.repository.PurchaseOrderReceiptRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PurchaseOrderReceiptInventoryTest {
    @Mock private PurchaseOrderService purchaseOrderService;
    @Mock private PurchaseOrderReceiptRepository receiptRepository;
    @Mock private PartQuantityService partQuantityService;
    @Mock private PartRepository partRepository;
    @Mock private PartMapper partMapper;
    @Mock private PartTransactionService partTransactionService;
    @Mock private WebhookDispatchService webhookDispatchService;
    @InjectMocks private PurchaseOrderReceiptService service;

    @Test
    void receiptRejectsInventoryOverflowBeforePersistingReceipt() {
        PurchaseOrder order = new PurchaseOrder();
        order.setId(42L);
        order.setReceivingWorkflowEnabled(true);
        order.setStatus(ApprovalStatus.APPROVED);
        Part part = new Part();
        part.setId(9L);
        part.setQuantity(Double.MAX_VALUE);
        PartQuantity orderLine = new PartQuantity(part, null, order, Double.MAX_VALUE);
        orderLine.setId(90L);
        when(purchaseOrderService.findByIdForUpdateAndCompany(42L, 7L)).thenReturn(Optional.of(order));
        when(receiptRepository.findByPurchaseOrder_IdAndIdempotencyKey(42L, "receipt-overflow"))
                .thenReturn(Optional.empty());
        when(partQuantityService.findByPurchaseOrder(42L)).thenReturn(List.of(orderLine));
        when(receiptRepository.sumReceivedByPurchaseOrderLine(42L)).thenReturn(List.of());
        when(partRepository.findByIdAndCompany_IdForUpdate(9L, 7L)).thenReturn(Optional.of(part));

        PurchaseOrderReceiptRequest request = new PurchaseOrderReceiptRequest();
        request.setIdempotencyKey("receipt-overflow");
        PurchaseOrderReceiptRequest.Line line = new PurchaseOrderReceiptRequest.Line();
        line.setPurchaseOrderLineId(90L);
        line.setQuantity(1.0e308);
        request.setLines(List.of(line));

        CustomException error = assertThrows(CustomException.class,
                () -> service.receive(42L, 7L, null, request));

        assertEquals("procurement_inventory_quantity_overflow", error.getMessage());
        verify(receiptRepository, never()).saveAndFlush(org.mockito.ArgumentMatchers.any());
        verify(partRepository, never()).save(part);
    }

    @Test
    void receiptRejectsNonFiniteHistoricalReceiptTotals() {
        Part part = new Part();
        part.setId(9L);
        PartQuantity orderLine = configuredOrderLine(part, 5d);
        when(purchaseOrderService.findByIdForUpdateAndCompany(42L, 7L)).thenReturn(Optional.of(orderLine.getPurchaseOrder()));
        when(receiptRepository.findByPurchaseOrder_IdAndIdempotencyKey(42L, "receipt-invalid-history"))
                .thenReturn(Optional.empty());
        when(partQuantityService.findByPurchaseOrder(42L)).thenReturn(List.of(orderLine));
        when(receiptRepository.sumReceivedByPurchaseOrderLine(42L)).thenReturn(List.<Object[]>of(
                new Object[]{90L, Double.NaN}));

        CustomException error = assertThrows(CustomException.class, () ->
                service.receive(42L, 7L, null, receiptRequest("receipt-invalid-history", 90L, 1d)));

        assertEquals("purchase_order_receipt_totals_invalid", error.getMessage());
        verify(receiptRepository, never()).saveAndFlush(org.mockito.ArgumentMatchers.any());
        verify(partRepository, never()).findByIdAndCompany_IdForUpdate(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any());
    }

    @Test
    void receiptRejectsInvalidHistoricalOrderQuantity() {
        Part part = new Part();
        part.setId(9L);
        PartQuantity orderLine = configuredOrderLine(part, Double.POSITIVE_INFINITY);
        when(purchaseOrderService.findByIdForUpdateAndCompany(42L, 7L)).thenReturn(Optional.of(orderLine.getPurchaseOrder()));
        when(receiptRepository.findByPurchaseOrder_IdAndIdempotencyKey(42L, "receipt-invalid-order"))
                .thenReturn(Optional.empty());
        when(partQuantityService.findByPurchaseOrder(42L)).thenReturn(List.of(orderLine));
        when(receiptRepository.sumReceivedByPurchaseOrderLine(42L)).thenReturn(List.of());

        CustomException error = assertThrows(CustomException.class, () ->
                service.receive(42L, 7L, null, receiptRequest("receipt-invalid-order", 90L, 1d)));

        assertEquals("purchase_order_receipt_totals_invalid", error.getMessage());
        verify(receiptRepository, never()).saveAndFlush(org.mockito.ArgumentMatchers.any());
        verify(partRepository, never()).findByIdAndCompany_IdForUpdate(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any());
    }

    private PartQuantity configuredOrderLine(Part part, double quantity) {
        PurchaseOrder order = new PurchaseOrder();
        order.setId(42L);
        order.setReceivingWorkflowEnabled(true);
        order.setStatus(ApprovalStatus.APPROVED);
        PartQuantity line = new PartQuantity(part, null, order, quantity);
        line.setId(90L);
        return line;
    }

    private PurchaseOrderReceiptRequest receiptRequest(String idempotencyKey, Long orderLineId, double quantity) {
        PurchaseOrderReceiptRequest request = new PurchaseOrderReceiptRequest();
        request.setIdempotencyKey(idempotencyKey);
        PurchaseOrderReceiptRequest.Line line = new PurchaseOrderReceiptRequest.Line();
        line.setPurchaseOrderLineId(orderLineId);
        line.setQuantity(quantity);
        request.setLines(List.of(line));
        return request;
    }
}
