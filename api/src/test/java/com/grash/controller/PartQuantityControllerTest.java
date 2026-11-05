package com.grash.controller;

import com.grash.exception.CustomException;
import com.grash.mapper.PartQuantityMapper;
import com.grash.model.Company;
import com.grash.model.Part;
import com.grash.model.PartQuantity;
import com.grash.model.PurchaseOrder;
import com.grash.model.Role;
import com.grash.model.User;
import com.grash.model.enums.ApprovalStatus;
import com.grash.service.PartQuantityService;
import com.grash.service.PartService;
import com.grash.service.PurchaseOrderPolicyService;
import com.grash.service.PurchaseOrderService;
import com.grash.service.ProcurementSiteService;
import com.grash.service.ProcurementApprovalService;
import com.grash.service.UserService;
import com.grash.service.WorkOrderService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;

@ExtendWith(MockitoExtension.class)
class PartQuantityControllerTest {
    @Mock private PartQuantityService partQuantityService;
    @Mock private PartQuantityMapper partQuantityMapper;
    @Mock private UserService userService;
    @Mock private WorkOrderService workOrderService;
    @Mock private PartService partService;
    @Mock private PurchaseOrderService purchaseOrderService;
    @Mock private PurchaseOrderPolicyService purchaseOrderPolicyService;
    @Mock private ProcurementSiteService procurementSiteService;
    @Mock private ProcurementApprovalService procurementApprovalService;
    @Mock private HttpServletRequest request;

    @Test
    void legacyLineCreationRequiresAgreedSupplierPriceForPurchaseOrder() {
        Company company = new Company();
        company.setId(7L);
        Role role = Role.builder().editOtherPermissions(new java.util.HashSet<>()).build();
        User user = new User();
        user.setId(12L);
        user.setCompany(company);
        user.setRole(role);
        when(userService.whoami(request)).thenReturn(user);

        PurchaseOrder order = new PurchaseOrder();
        order.setId(70L);
        order.setCompany(company);
        order.setCreatedBy(user.getId());
        order.setStatus(ApprovalStatus.PENDING);
        when(purchaseOrderService.findByIdForUpdateAndCompany(70L, 7L)).thenReturn(Optional.of(order));
        when(partQuantityService.findByPurchaseOrder(70L)).thenReturn(List.of());

        Part part = new Part();
        part.setId(5L);
        part.setUnit("pcs");
        when(partService.findByIdAndCompany(5L, 7L)).thenReturn(Optional.of(part));

        PartQuantity requestLine = new PartQuantity();
        requestLine.setPart(part);
        requestLine.setPurchaseOrder(new PurchaseOrder());
        requestLine.getPurchaseOrder().setId(70L);
        requestLine.setQuantity(2d);
        doThrow(new IllegalArgumentException()).when(partQuantityService)
                .setAgreedPurchasePrice(requestLine, null);

        PartQuantityController controller = new PartQuantityController(partQuantityService, procurementSiteService,
                procurementApprovalService,
                partQuantityMapper, userService, workOrderService, partService, purchaseOrderService,
                purchaseOrderPolicyService);

        CustomException exception = assertThrows(CustomException.class, () -> controller.create(requestLine, request));

        assertEquals(org.springframework.http.HttpStatus.BAD_REQUEST, exception.getHttpStatus());
        verify(partQuantityService).setAgreedPurchasePrice(requestLine, null);
        verify(partQuantityService, never()).create(requestLine);
    }

    @Test
    void linePatchCannotBypassAnActivePurchaseOrderApproval() {
        Company company = new Company(); company.setId(7L);
        User user = new User(); user.setId(12L); user.setCompany(company);
        user.setRole(Role.builder().editOtherPermissions(new java.util.HashSet<>()).build());
        when(userService.whoami(request)).thenReturn(user);
        PurchaseOrder order = new PurchaseOrder(); order.setId(70L); order.setCompany(company);
        order.setCreatedBy(user.getId()); order.setStatus(ApprovalStatus.PENDING);
        when(purchaseOrderService.findByIdForUpdateAndCompany(70L, 7L)).thenReturn(Optional.of(order));
        when(partQuantityService.findByPurchaseOrder(70L)).thenReturn(List.of());
        doThrow(new CustomException("approval_document_locked", org.springframework.http.HttpStatus.CONFLICT))
                .when(procurementApprovalService).requireEditable("PO", 70L, 7L);
        PartQuantityController controller = new PartQuantityController(partQuantityService,
                procurementSiteService, procurementApprovalService, partQuantityMapper, userService,
                workOrderService, partService, purchaseOrderService, purchaseOrderPolicyService);

        CustomException error = assertThrows(CustomException.class,
                () -> controller.patchPurchaseOrder(List.of(), 70L, request));

        assertEquals(org.springframework.http.HttpStatus.CONFLICT, error.getHttpStatus());
        verify(partQuantityService, never()).save(any());
        verify(partQuantityService, never()).create(any());
    }
}
