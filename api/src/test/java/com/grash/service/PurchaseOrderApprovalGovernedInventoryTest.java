package com.grash.service;

import com.grash.model.PurchaseOrder;
import com.grash.model.Part;
import com.grash.model.PartQuantity;
import com.grash.model.User;
import com.grash.model.enums.ApprovalStatus;
import com.grash.exception.CustomException;
import com.grash.repository.PartRepository;
import com.grash.mapper.PartMapper;
import com.grash.repository.PurchaseRequisitionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PurchaseOrderApprovalGovernedInventoryTest {
    @Mock private PurchaseOrderService purchaseOrderService;
    @Mock private PartQuantityService partQuantityService;
    @Mock private PartRepository partRepository;
    @Mock private PartMapper partMapper;
    @Mock private WebhookDispatchService webhookDispatchService;
    @Mock private PurchaseRequisitionRepository purchaseRequisitionRepository;
    @Mock private ProcurementApprovalService procurementApprovals;
    @InjectMocks private PurchaseOrderApprovalService service;

    @Test
    void policyApprovalDoesNotAddStockBeforeReceipt() {
        PurchaseOrder order = new PurchaseOrder();
        order.setId(42L);
        order.setStatus(ApprovalStatus.PENDING);
        order.setReceivingWorkflowEnabled(true);
        when(purchaseOrderService.findByIdForUpdateAndCompany(42L, 7L)).thenReturn(Optional.of(order));
        when(procurementApprovals.decide("PO", 42L, 7L, null, true, null)).thenReturn(true);
        when(partQuantityService.findByPurchaseOrder(42L)).thenReturn(List.of());
        when(purchaseOrderService.save(any(PurchaseOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PurchaseOrder result = service.respond(42L, 7L, true);

        assertEquals(ApprovalStatus.APPROVED, result.getStatus());
        verify(partRepository, never()).findByIdAndCompany_IdForUpdate(anyLong(), anyLong());
    }

    @Test
    void finalPolicyApprovalPreservesLegacyReceiptWhenReceivingWorkflowIsDisabled() {
        PurchaseOrder order = new PurchaseOrder();
        order.setId(43L);
        order.setStatus(ApprovalStatus.PENDING);
        order.setReceivingWorkflowEnabled(false);
        Part part = new Part();
        part.setId(5L);
        part.setQuantity(3d);
        PartQuantity line = new PartQuantity(part, null, order, 2d);
        when(purchaseOrderService.findByIdForUpdateAndCompany(43L, 7L)).thenReturn(Optional.of(order));
        when(procurementApprovals.decide("PO", 43L, 7L, null, true, null)).thenReturn(true);
        when(partQuantityService.findByPurchaseOrder(43L)).thenReturn(List.of(line));
        when(partRepository.findByIdAndCompany_IdForUpdate(5L, 7L)).thenReturn(Optional.of(part));
        when(purchaseOrderService.save(any(PurchaseOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PurchaseOrder result = service.respond(43L, 7L, true);

        assertEquals(ApprovalStatus.APPROVED, result.getStatus());
        assertEquals(5d, part.getQuantity());
        verify(partRepository).save(part);
    }

    @Test
    void finalLegacyApprovalRejectsInventoryOverflow() {
        PurchaseOrder order = new PurchaseOrder();
        order.setId(46L);
        order.setStatus(ApprovalStatus.PENDING);
        order.setReceivingWorkflowEnabled(false);
        Part part = new Part();
        part.setId(6L);
        part.setQuantity(Double.MAX_VALUE);
        PartQuantity line = new PartQuantity(part, null, order, Double.MAX_VALUE);
        when(purchaseOrderService.findByIdForUpdateAndCompany(46L, 7L)).thenReturn(Optional.of(order));
        when(procurementApprovals.decide("PO", 46L, 7L, null, true, null)).thenReturn(true);
        when(partQuantityService.findByPurchaseOrder(46L)).thenReturn(List.of(line));
        when(partRepository.findByIdAndCompany_IdForUpdate(6L, 7L)).thenReturn(Optional.of(part));

        CustomException error = assertThrows(CustomException.class, () -> service.respond(46L, 7L, true));

        assertEquals("procurement_inventory_quantity_overflow", error.getMessage());
        verify(partRepository, never()).save(part);
        verify(purchaseOrderService, never()).save(any(PurchaseOrder.class));
    }

    @Test
    void requesterCannotSelfApproveLegacyPurchaseOrder() {
        PurchaseOrder order = new PurchaseOrder();
        order.setId(44L);
        order.setCreatedBy(12L);
        order.setStatus(ApprovalStatus.PENDING);
        User requester = new User();
        requester.setId(12L);
        when(purchaseOrderService.findByIdForUpdateAndCompany(44L, 7L)).thenReturn(Optional.of(order));
        when(procurementApprovals.decide("PO", 44L, 7L, requester, true, null)).thenReturn(null);

        CustomException error = assertThrows(CustomException.class,
                () -> service.respond(44L, 7L, true, requester, null));

        assertEquals("approval_not_assigned", error.getMessage());
        verify(procurementApprovals).decide("PO", 44L, 7L, requester, true, null);
        verify(purchaseOrderService, never()).save(any(PurchaseOrder.class));
    }

    @Test
    void explicitSubmitApprovalRemainsAvailableForAuthorizedLegacyPurchaseOrders() {
        PurchaseOrder order = new PurchaseOrder();
        order.setId(45L);
        order.setCreatedBy(12L);
        order.setReceivingWorkflowEnabled(true);
        order.setStatus(ApprovalStatus.PENDING);
        User requester = new User();
        requester.setId(12L);
        when(purchaseOrderService.findByIdForUpdateAndCompany(45L, 7L)).thenReturn(Optional.of(order));
        when(procurementApprovals.decide("PO", 45L, 7L, requester, true, null)).thenReturn(null);
        when(partQuantityService.findByPurchaseOrder(45L)).thenReturn(List.of());
        when(purchaseOrderService.save(any(PurchaseOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PurchaseOrder result = service.respond(45L, 7L, true, requester, null, true);

        assertEquals(ApprovalStatus.APPROVED, result.getStatus());
    }
}
