package com.grash.service;

import com.grash.exception.CustomException;
import org.hibernate.Hibernate;
import com.grash.mapper.PartMapper;
import com.grash.model.Company;
import com.grash.model.Part;
import com.grash.model.PartQuantity;
import com.grash.model.PurchaseRequisition;
import com.grash.model.PurchaseRequisitionLine;
import com.grash.model.PurchaseOrder;
import com.grash.model.enums.ApprovalStatus;
import com.grash.model.enums.PurchaseRequisitionStatus;
import com.grash.model.enums.webhook.PartField;
import com.grash.model.enums.webhook.WebhookEvent;
import com.grash.repository.PartRepository;
import com.grash.repository.PurchaseRequisitionRepository;
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
import java.util.Set;
import java.util.TreeSet;

/** Shared PO approval transition so manual and workflow approval have identical inventory effects. */
@Service
@RequiredArgsConstructor
public class PurchaseOrderApprovalService {
    private final PurchaseOrderService purchaseOrderService;
    private final PartQuantityService partQuantityService;
    private final PartRepository partRepository;
    private final PartMapper partMapper;
    private final WebhookDispatchService webhookDispatchService;
    private final PurchaseRequisitionRepository purchaseRequisitionRepository;

    @Transactional
    public PurchaseOrder respond(Long id, Long companyId, boolean approved) {
        PurchaseOrder purchaseOrder = purchaseOrderService.findByIdForUpdateAndCompany(id, companyId)
                .orElseThrow(() -> new CustomException("PurchaseOrder not found", HttpStatus.NOT_FOUND));
        if (purchaseOrder.getStatus() == ApprovalStatus.REJECTED && !approved) {
            return purchaseOrder;
        }
        if (purchaseOrder.getStatus() != ApprovalStatus.PENDING) {
            throw new CustomException("Only a pending purchase order can be decided", HttpStatus.CONFLICT);
        }

        Collection<PartQuantity> quantities = partQuantityService.findByPurchaseOrder(purchaseOrder.getId())
                .stream()
                .sorted(Comparator.comparing(quantity -> quantity.getPart().getId()))
                .toList();
        if (approved) {
            if (!purchaseOrder.isReceivingWorkflowEnabled()) for (PartQuantity quantity : quantities) {
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
        } else {
            releaseRequisitionQuantities(quantities, companyId);
        }

        purchaseOrder.setStatus(approved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED);
        return purchaseOrderService.save(purchaseOrder);
    }

    private void releaseRequisitionQuantities(Collection<PartQuantity> quantities, Long companyId) {
        Set<Long> requisitionIds = new TreeSet<>();
        for (PartQuantity quantity : quantities) {
            if (quantity.getRequisitionLine() != null) {
                requisitionIds.add(quantity.getRequisitionLine().getRequisition().getId());
            }
        }
        Map<Long, PurchaseRequisition> requisitions = new HashMap<>();
        for (Long requisitionId : requisitionIds) {
            PurchaseRequisition requisition = purchaseRequisitionRepository
                    .findByIdForUpdateAndCompany(requisitionId, companyId)
                    .orElseThrow(() -> new CustomException("Purchase requisition not found", HttpStatus.NOT_FOUND));
            Hibernate.initialize(requisition.getLines());
            requisitions.put(requisitionId, requisition);
        }
        for (PartQuantity quantity : quantities) {
            if (quantity.getRequisitionLine() == null) continue;
            Long requisitionId = quantity.getRequisitionLine().getRequisition().getId();
            PurchaseRequisition requisition = requisitions.get(requisitionId);
            PurchaseRequisitionLine sourceLine = requisition.getLines().stream()
                    .filter(line -> line.getId().equals(quantity.getRequisitionLine().getId()))
                    .findFirst().orElseThrow(() -> new CustomException("Requisition source line not found", HttpStatus.CONFLICT));
            double released = sourceLine.getOrderedQuantity() - quantity.getQuantity();
            if (released < -0.000001) {
                throw new CustomException("Requisition order quantity is inconsistent", HttpStatus.CONFLICT);
            }
            sourceLine.setOrderedQuantity(Math.max(0, released));
        }
        for (PurchaseRequisition requisition : requisitions.values()) {
            boolean remaining = requisition.getLines().stream()
                    .anyMatch(line -> line.getOrderedQuantity() + 1e-9 < line.getQuantity());
            boolean ordered = requisition.getLines().stream().anyMatch(line -> line.getOrderedQuantity() > 0);
            requisition.setStatus(remaining
                    ? ordered ? PurchaseRequisitionStatus.PARTIALLY_ORDERED : PurchaseRequisitionStatus.APPROVED
                    : PurchaseRequisitionStatus.ORDERED);
            purchaseRequisitionRepository.save(requisition);
        }
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
