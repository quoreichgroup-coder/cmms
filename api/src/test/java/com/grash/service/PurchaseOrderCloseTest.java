package com.grash.service;

import com.grash.exception.CustomException;
import com.grash.mapper.PartMapper;
import com.grash.model.*;
import com.grash.model.enums.ApprovalStatus;
import com.grash.model.enums.PermissionEntity;
import com.grash.model.enums.PurchaseRequisitionStatus;
import com.grash.repository.PartRepository;
import com.grash.repository.PurchaseRequisitionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PurchaseOrderCloseTest {
    @Mock private PurchaseOrderService purchaseOrderService;
    @Mock private PartQuantityService partQuantityService;
    @Mock private PartRepository partRepository;
    @Mock private PartMapper partMapper;
    @Mock private WebhookDispatchService webhookDispatchService;
    @Mock private PurchaseOrderWebhookService purchaseOrderWebhookService;
    @Mock private PurchaseRequisitionRepository purchaseRequisitionRepository;
    @Mock private ProcurementApprovalService procurementApprovals;
    @Mock private PurchaseOrderReceiptService purchaseOrderReceiptService;
    @InjectMocks private PurchaseOrderApprovalService service;

    private User buyer;
    private PurchaseOrder order;

    @BeforeEach
    void setUp() {
        Company company = new Company();
        company.setId(7L);
        Role role = Role.builder().id(1L)
                .editOtherPermissions(new HashSet<>(Set.of(PermissionEntity.PURCHASE_ORDERS))).build();
        buyer = new User();
        buyer.setId(3L);
        buyer.setCompany(company);
        buyer.setRole(role);
        order = new PurchaseOrder();
        order.setId(42L);
        order.setStatus(ApprovalStatus.APPROVED);
        order.setReceivingWorkflowEnabled(true);
        lenient().when(purchaseOrderService.findByIdForUpdateAndCompany(42L, 7L)).thenReturn(Optional.of(order));
    }

    @Test
    void closingReleasesOnlyTheUnreceivedBalanceToTheRequisition() {
        PurchaseRequisition requisition = new PurchaseRequisition();
        requisition.setId(9L);
        PurchaseRequisitionLine source = new PurchaseRequisitionLine();
        source.setId(90L);
        source.setRequisition(requisition);
        source.setQuantity(10);
        source.setOrderedQuantity(10);
        requisition.setLines(new ArrayList<>(List.of(source)));
        PartQuantity line = new PartQuantity(new Part(), null, order, 10);
        line.setId(100L);
        line.setRequisitionLine(source);
        when(partQuantityService.findByPurchaseOrder(42L)).thenReturn(List.of(line));
        when(purchaseOrderReceiptService.receivedByLine(42L)).thenReturn(Map.of(100L, 4d));
        when(purchaseRequisitionRepository.findByIdForUpdateAndCompany(9L, 7L)).thenReturn(Optional.of(requisition));
        when(purchaseOrderService.save(any(PurchaseOrder.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PurchaseOrder closed = service.close(42L, buyer, " Supplier cannot deliver the balance ");

        assertNotNull(closed.getClosedAt());
        assertEquals(3L, closed.getClosedById());
        assertEquals("Supplier cannot deliver the balance", closed.getCloseReason());
        assertEquals(4d, source.getOrderedQuantity(), 1e-9);
        assertEquals(PurchaseRequisitionStatus.PARTIALLY_ORDERED, requisition.getStatus());
        verify(purchaseOrderWebhookService).changed(closed);
    }

    @Test
    void onlyApprovedOrdersInTheReceivingWorkflowCanBeClosed() {
        order.setStatus(ApprovalStatus.PENDING);

        CustomException ex = assertThrows(CustomException.class, () -> service.close(42L, buyer, "reason"));

        assertEquals(HttpStatus.CONFLICT, ex.getHttpStatus());
        verify(purchaseOrderService, never()).save(any());
    }

    @Test
    void aReasonIsRequiredAndAnOrderIsClosedOnlyOnce() {
        assertEquals(HttpStatus.BAD_REQUEST,
                assertThrows(CustomException.class, () -> service.close(42L, buyer, "  ")).getHttpStatus());
        order.setClosedAt(new Date());
        assertEquals("purchase_order_closed",
                assertThrows(CustomException.class, () -> service.close(42L, buyer, "again")).getMessage());
    }
}
