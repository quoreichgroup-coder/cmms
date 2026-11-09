package com.grash.service;

import com.grash.advancedsearch.SearchCriteria;
import com.grash.advancedsearch.SpecificationBuilder;
import com.grash.dto.PurchaseOrderPatchDTO;
import com.grash.dto.PurchaseOrderShowDTO;
import com.grash.exception.CustomException;
import com.grash.mapper.PurchaseOrderMapper;
import com.grash.model.PurchaseOrder;
import com.grash.model.enums.ApprovalStatus;
import com.grash.repository.PurchaseOrderRepository;
import com.grash.utils.Sanitizer;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PurchaseOrderService {
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderMapper purchaseOrderMapper;
    private final CompanyService companyService;
    private final EntityManager em;
    private final ProcurementApprovalService procurementApprovals;
    private final ProcurementSiteService procurementSiteService;
    private final PurchaseOrderWebhookService purchaseOrderWebhookService;

    @Transactional
    public PurchaseOrder create(PurchaseOrder purchaseOrder) {
        // The request body cannot set a final status. The controller starts the policy
        // after it has persisted the complete PO, including separately submitted lines.
        // Creation never merges onto an existing order (every caller builds a new PO from a request body).
        purchaseOrder.setId(null);
        purchaseOrder.setClosedAt(null);
        purchaseOrder.setClosedById(null);
        purchaseOrder.setCloseReason(null);
        purchaseOrder.setStatus(ApprovalStatus.PENDING);
        Sanitizer.sanitizePurchaseOrder(purchaseOrder);
        PurchaseOrder savedPurchaseOrder = purchaseOrderRepository.saveAndFlush(purchaseOrder);
        em.refresh(savedPurchaseOrder);
        purchaseOrderWebhookService.created(savedPurchaseOrder);
        return savedPurchaseOrder;
    }

    @Transactional
    public PurchaseOrder update(Long id, Long companyId, PurchaseOrderPatchDTO purchaseOrder) {
        PurchaseOrder savedPurchaseOrder = purchaseOrderRepository.findByIdForUpdateAndCompany(id, companyId)
                .orElseThrow(() -> new CustomException("Not found", HttpStatus.NOT_FOUND));
        procurementApprovals.requireEditable("PO", id, companyId);
        if (savedPurchaseOrder.getStatus() == ApprovalStatus.APPROVED) {
            throw new CustomException("Approved purchase orders cannot be changed", HttpStatus.CONFLICT);
        }
        boolean receivingWorkflowEnabled = savedPurchaseOrder.isReceivingWorkflowEnabled();
        PurchaseOrder updatedPurchaseOrder = purchaseOrderMapper.updatePurchaseOrder(savedPurchaseOrder,
                purchaseOrder);
        // Flow version is selected at creation and cannot be upgraded/downgraded by a client patch.
        updatedPurchaseOrder.setReceivingWorkflowEnabled(receivingWorkflowEnabled);
        Sanitizer.sanitizePurchaseOrder(updatedPurchaseOrder);
        updatedPurchaseOrder = purchaseOrderRepository.saveAndFlush(updatedPurchaseOrder);
        em.refresh(updatedPurchaseOrder);
        purchaseOrderWebhookService.changed(updatedPurchaseOrder);
        return updatedPurchaseOrder;
    }

    @Transactional
    public void delete(Long id, Long companyId) {
        procurementApprovals.requireEditable("PO", id, companyId);
        PurchaseOrder purchaseOrder = purchaseOrderRepository.findByIdForUpdateAndCompany(id, companyId)
                .orElseThrow(() -> new CustomException("Not found", HttpStatus.NOT_FOUND));
        if (purchaseOrder.getStatus() == ApprovalStatus.APPROVED) {
            throw new CustomException("Approved purchase orders cannot be deleted", HttpStatus.CONFLICT);
        }
        purchaseOrderRepository.delete(purchaseOrder);
    }

    public Optional<PurchaseOrder> findByIdAndCompany_Id(Long id, Long companyId) {
        return purchaseOrderRepository.findByIdAndCompany_Id(id, companyId);
    }

    @Transactional
    public Optional<PurchaseOrder> findByIdForUpdateAndCompany(Long id, Long companyId) {
        return purchaseOrderRepository.findByIdForUpdateAndCompany(id, companyId);
    }

    public PurchaseOrder save(PurchaseOrder purchaseOrder) {
        return purchaseOrderRepository.save(purchaseOrder);
    }

    public Page<PurchaseOrderShowDTO> findBySearchCriteria(SearchCriteria searchCriteria, com.grash.model.User user) {
        SpecificationBuilder<PurchaseOrder> builder = new SpecificationBuilder<>();
        searchCriteria.getFilterFields().forEach(builder::with);
        builder.with(procurementSiteService.purchaseOrdersVisibleTo(user));
        Pageable page = PageRequest.of(searchCriteria.getPageNum(), searchCriteria.getPageSize(),
                searchCriteria.getDirection(), searchCriteria.getSortField());
        return purchaseOrderRepository.findAll(builder.build(), page).map(purchaseOrderMapper::toShowDto);
    }

    public Page<PurchaseOrder> findReceivable(Long companyId, boolean includeOthers, Long userId,
                                              boolean allSites, java.util.Collection<Long> siteIds,
                                              String query, String receiptState, Pageable pageable) {
        return purchaseOrderRepository.findReceivable(companyId, ApprovalStatus.APPROVED,
                includeOthers, userId, allSites, siteIds, query, receiptState, pageable);
    }
}

