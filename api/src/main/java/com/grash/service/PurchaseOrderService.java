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

    @Transactional
    public PurchaseOrder create(PurchaseOrder purchaseOrder) {
        // The request body cannot bypass the approval and inventory transaction.
        purchaseOrder.setStatus(ApprovalStatus.PENDING);
        Sanitizer.sanitizePurchaseOrder(purchaseOrder);
        PurchaseOrder savedPurchaseOrder = purchaseOrderRepository.saveAndFlush(purchaseOrder);
        em.refresh(savedPurchaseOrder);
        return savedPurchaseOrder;
    }

    @Transactional
    public PurchaseOrder update(Long id, Long companyId, PurchaseOrderPatchDTO purchaseOrder) {
        PurchaseOrder savedPurchaseOrder = purchaseOrderRepository.findByIdForUpdateAndCompany(id, companyId)
                .orElseThrow(() -> new CustomException("Not found", HttpStatus.NOT_FOUND));
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
        return updatedPurchaseOrder;
    }

    @Transactional
    public void delete(Long id, Long companyId) {
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

    public Page<PurchaseOrderShowDTO> findBySearchCriteria(SearchCriteria searchCriteria) {
        SpecificationBuilder<PurchaseOrder> builder = new SpecificationBuilder<>();
        searchCriteria.getFilterFields().forEach(builder::with);
        Pageable page = PageRequest.of(searchCriteria.getPageNum(), searchCriteria.getPageSize(),
                searchCriteria.getDirection(), searchCriteria.getSortField());
        return purchaseOrderRepository.findAll(builder.build(), page).map(purchaseOrderMapper::toShowDto);
    }

    public Page<PurchaseOrder> findReceivable(Long companyId, boolean includeOthers, Long userId,
                                              Pageable pageable) {
        return purchaseOrderRepository.findReceivable(companyId, ApprovalStatus.APPROVED,
                includeOthers, userId, pageable);
    }
}

