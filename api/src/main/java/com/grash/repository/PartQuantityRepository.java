package com.grash.repository;

import com.grash.model.PartQuantity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.Optional;

public interface PartQuantityRepository extends JpaRepository<PartQuantity, Long> {
    Collection<PartQuantity> findByCompany_Id(Long id);

    Collection<PartQuantity> findByWorkOrder_Id(Long id);

    @EntityGraph(attributePaths = "part")
    Collection<PartQuantity> findByWorkOrder_IdIn(Collection<Long> workOrderIds);

    Collection<PartQuantity> findByPart_Id(Long id);

    Collection<PartQuantity> findByPurchaseOrder_Id(Long id);

    @EntityGraph(attributePaths = {"part", "site", "requisitionLine.requisition"})
    @Query("select line from PartQuantity line where line.purchaseOrder.id = :purchaseOrderId order by line.id asc")
    Collection<PartQuantity> findDocumentLinesByPurchaseOrderId(@Param("purchaseOrderId") Long purchaseOrderId);

    boolean existsBySite_Id(Long siteId);

    void deleteByCompany_IdAndIsDemoTrue(Long companyId);
}
