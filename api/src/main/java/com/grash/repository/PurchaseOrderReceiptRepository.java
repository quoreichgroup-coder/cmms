package com.grash.repository;

import com.grash.model.PurchaseOrderReceipt;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PurchaseOrderReceiptRepository extends JpaRepository<PurchaseOrderReceipt, Long> {
    boolean existsByPurchaseOrder_Id(Long purchaseOrderId);

    @EntityGraph(attributePaths = {"lines.partQuantity.part", "receivedBy", "purchaseOrder"})
    Optional<PurchaseOrderReceipt> findByPurchaseOrder_IdAndIdempotencyKey(Long purchaseOrderId, String key);

    @EntityGraph(attributePaths = {"lines.partQuantity.part", "receivedBy", "purchaseOrder"})
    @Query("select receipt from PurchaseOrderReceipt receipt where receipt.purchaseOrder.id = :purchaseOrderId " +
            "order by receipt.receivedAt desc, receipt.id desc")
    List<PurchaseOrderReceipt> findByPurchaseOrderIdForDisplay(@Param("purchaseOrderId") Long purchaseOrderId);

    @Query("select line.partQuantity.id, sum(line.quantity) from PurchaseOrderReceiptLine line " +
            "where line.partQuantity.purchaseOrder.id = :purchaseOrderId group by line.partQuantity.id")
    List<Object[]> sumReceivedByPurchaseOrderLine(@Param("purchaseOrderId") Long purchaseOrderId);
}
