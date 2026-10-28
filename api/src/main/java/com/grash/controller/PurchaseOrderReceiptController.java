package com.grash.controller;

import com.grash.dto.PurchaseOrderReceiptRequest;
import com.grash.dto.PurchaseOrderReceiptShowDTO;
import com.grash.exception.CustomException;
import com.grash.model.PurchaseOrder;
import com.grash.model.User;
import com.grash.model.enums.PermissionEntity;
import com.grash.service.PurchaseOrderPolicyService;
import com.grash.service.PurchaseOrderReceiptService;
import com.grash.service.PurchaseOrderService;
import com.grash.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/purchase-orders/{id}/receipts")
@RequiredArgsConstructor
public class PurchaseOrderReceiptController {
    private final PurchaseOrderReceiptService receiptService;
    private final PurchaseOrderService purchaseOrderService;
    private final PurchaseOrderPolicyService procurementPolicy;
    private final UserService userService;

    @GetMapping
    @PreAuthorize("permitAll()")
    @Transactional(readOnly = true)
    public List<PurchaseOrderReceiptShowDTO> list(@PathVariable Long id, HttpServletRequest request) {
        User user = userService.whoami(request);
        if (!user.getRole().getViewPermissions().contains(PermissionEntity.PURCHASE_RECEIPTS)) {
            throw new CustomException("Purchase receipt view permission required", HttpStatus.FORBIDDEN);
        }
        PurchaseOrder order = visibleOrder(id, user);
        if (!order.isReceivingWorkflowEnabled()) return List.of();
        return receiptService.list(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public PurchaseOrderReceiptShowDTO receive(@PathVariable Long id,
            @Valid @RequestBody PurchaseOrderReceiptRequest body, HttpServletRequest request) {
        User user = userService.whoami(request);
        if (!user.getRole().getEditOtherPermissions().contains(PermissionEntity.PURCHASE_RECEIPTS)) {
            throw new CustomException("Purchase receipt permission required", HttpStatus.FORBIDDEN);
        }
        procurementPolicy.requireModuleEnabled(user);
        visibleOrder(id, user);
        return receiptService.receive(id, user.getCompany().getId(), user, body);
    }

    private PurchaseOrder visibleOrder(Long id, User user) {
        PurchaseOrder order = purchaseOrderService.findByIdAndCompany_Id(id, user.getCompany().getId())
                .orElseThrow(() -> new CustomException("Purchase order not found", HttpStatus.NOT_FOUND));
        if (!order.canBeViewedBy(user)) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
        return order;
    }
}
