package com.grash.repository;

import com.grash.model.PurchaseOrder;
import com.grash.model.enums.ApprovalStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long>, JpaSpecificationExecutor<PurchaseOrder> {
    Collection<PurchaseOrder> findByCompany_Id(@Param("x") Long id);

    boolean existsByCategory_IdAndCompany_Id(Long categoryId, Long companyId);

    Optional<PurchaseOrder> findByIdAndCompany_Id(Long id, Long companyId);

    @Query(value = "select po from PurchaseOrder po left join po.vendor vendor where po.company.id = :companyId " +
            "and po.receivingWorkflowEnabled = true and po.status = :status " +
            "and (:includeOthers = true or po.createdBy = :userId) " +
            "and (:allSites = true or not exists (select scoped.id from PartQuantity scoped where scoped.purchaseOrder = po and scoped.site is not null and scoped.site.id not in :siteIds)) " +
            "and (:query is null or lower(po.name) like lower(concat('%', :query, '%')) " +
            "or lower(coalesce(vendor.companyName, '')) like lower(concat('%', :query, '%'))) " +
            "and (:receiptState = 'ALL' " +
            "or (:receiptState = 'NOT_STARTED' and not exists (select receipt.id from PurchaseOrderReceiptLine receipt join receipt.partQuantity receivedLine where receivedLine.purchaseOrder = po)) " +
            "or (:receiptState = 'PARTIAL' and exists (select receipt.id from PurchaseOrderReceiptLine receipt join receipt.partQuantity receivedLine where receivedLine.purchaseOrder = po) " +
            "and exists (select openLine.id from PartQuantity openLine where openLine.purchaseOrder = po " +
            "and openLine.quantity > coalesce((select sum(receiptLine.quantity) from PurchaseOrderReceiptLine receiptLine where receiptLine.partQuantity = openLine), 0.0)))) " +
            "and exists (select line.id from PartQuantity line where line.purchaseOrder = po " +
            "and line.quantity > coalesce((select sum(receiptLine.quantity) from PurchaseOrderReceiptLine receiptLine " +
            "where receiptLine.partQuantity = line), 0.0))",
            countQuery = "select count(po) from PurchaseOrder po left join po.vendor vendor where po.company.id = :companyId " +
                    "and po.receivingWorkflowEnabled = true and po.status = :status " +
                    "and (:includeOthers = true or po.createdBy = :userId) " +
                    "and (:allSites = true or not exists (select scoped.id from PartQuantity scoped where scoped.purchaseOrder = po and scoped.site is not null and scoped.site.id not in :siteIds)) " +
                    "and (:query is null or lower(po.name) like lower(concat('%', :query, '%')) " +
                    "or lower(coalesce(vendor.companyName, '')) like lower(concat('%', :query, '%'))) " +
                    "and (:receiptState = 'ALL' " +
                    "or (:receiptState = 'NOT_STARTED' and not exists (select receipt.id from PurchaseOrderReceiptLine receipt join receipt.partQuantity receivedLine where receivedLine.purchaseOrder = po)) " +
                    "or (:receiptState = 'PARTIAL' and exists (select receipt.id from PurchaseOrderReceiptLine receipt join receipt.partQuantity receivedLine where receivedLine.purchaseOrder = po) " +
                    "and exists (select openLine.id from PartQuantity openLine where openLine.purchaseOrder = po " +
                    "and openLine.quantity > coalesce((select sum(receiptLine.quantity) from PurchaseOrderReceiptLine receiptLine where receiptLine.partQuantity = openLine), 0.0)))) " +
                    "and exists (select line.id from PartQuantity line where line.purchaseOrder = po " +
                    "and line.quantity > coalesce((select sum(receiptLine.quantity) from PurchaseOrderReceiptLine receiptLine " +
                    "where receiptLine.partQuantity = line), 0.0))")
    Page<PurchaseOrder> findReceivable(@Param("companyId") Long companyId,
                                      @Param("status") ApprovalStatus status,
                                      @Param("includeOthers") boolean includeOthers,
                                      @Param("userId") Long userId,
                                      @Param("allSites") boolean allSites,
                                      @Param("siteIds") Collection<Long> siteIds,
                                      @Param("query") String query,
                                      @Param("receiptState") String receiptState,
                                      Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select purchaseOrder from PurchaseOrder purchaseOrder " +
            "where purchaseOrder.id = :id and purchaseOrder.company.id = :companyId")
    Optional<PurchaseOrder> findByIdForUpdateAndCompany(@Param("id") Long id,
                                                        @Param("companyId") Long companyId);
}
