package com.grash.service;

import com.grash.exception.CustomException;
import com.grash.mapper.PartMapper;
import com.grash.model.Company;
import com.grash.model.Part;
import com.grash.model.PartQuantity;
import com.grash.model.PurchaseOrder;
import com.grash.model.enums.ApprovalStatus;
import com.grash.model.enums.webhook.PartField;
import com.grash.model.enums.webhook.WebhookEvent;
import com.grash.repository.PartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Map;

/** Shared PO approval transition so manual and workflow approval have identical inventory effects. */
@Service
@RequiredArgsConstructor
public class PurchaseOrderApprovalService {
    private final PurchaseOrderService purchaseOrderService;
    private final PartQuantityService partQuantityService;
    private final PartRepository partRepository;
    private final PartMapper partMapper;
    private final WebhookDispatchService webhookDispatchService;

    @Transactional
    public PurchaseOrder respond(Long id, Long companyId, boolean approved) {
        PurchaseOrder purchaseOrder = purchaseOrderService.findByIdForUpdateAndCompany(id, companyId)
                .orElseThrow(() -> new CustomException("PurchaseOrder not found", HttpStatus.NOT_FOUND));
        if (purchaseOrder.getStatus() == ApprovalStatus.APPROVED) {
            throw new CustomException("The purchase order has already been approved", HttpStatus.NOT_ACCEPTABLE);
        }

        if (approved) {
            Collection<PartQuantity> quantities = partQuantityService.findByPurchaseOrder(purchaseOrder.getId())
                    .stream()
                    .sorted(Comparator.comparing(quantity -> quantity.getPart().getId()))
                    .toList();
            for (PartQuantity quantity : quantities) {
                if (!Double.isFinite(quantity.getQuantity()) || quantity.getQuantity() <= 0) {
                    throw new CustomException("Purchase order contains an invalid part quantity",
                            HttpStatus.CONFLICT);
                }
                Part part = partRepository.findByIdAndCompany_IdForUpdate(quantity.getPart().getId(), companyId)
                        .orElseThrow(() -> new CustomException("Part not found", HttpStatus.NOT_FOUND));
                if (part.isNonStock()) {
                    continue;
                }
                double previousQuantity = part.getQuantity();
                part.setQuantity(previousQuantity + quantity.getQuantity());
                partRepository.save(part);
                dispatchPartQuantityChangeWebhookAfterCommit(part, previousQuantity, part.getQuantity(),
                        quantity, purchaseOrder, purchaseOrder.getCompany());
            }
        }

        purchaseOrder.setStatus(approved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED);
        return purchaseOrderService.save(purchaseOrder);
    }

    private void dispatchPartQuantityChangeWebhookAfterCommit(Part part, double previousQuantity,
                                                              double newQuantity, PartQuantity quantity,
                                                              PurchaseOrder purchaseOrder, Company company) {
        Runnable dispatch = () -> {
            Map<String, Object> payload = new HashMap<>();
            payload.put("partId", part.getId());
            payload.put("partName", part.getName());
            payload.put("previousQuantity", previousQuantity);
            payload.put("newQuantity", newQuantity);
            payload.put("changedAmount", quantity.getQuantity());
            payload.put("purchaseOrderId", purchaseOrder.getId());
            payload.put("purchaseOrderName", purchaseOrder.getName());
            payload.put("partQuantityId", quantity.getId());
            webhookDispatchService.dispatchWebhook(company, WebhookEvent.PART_QUANTITY_CHANGED, payload,
                    "changedPart", partMapper.toShowDto(part), null, null, null, null,
                    Collections.singletonList(PartField.QUANTITY));
        };
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            dispatch.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                dispatch.run();
            }
        });
    }
}
