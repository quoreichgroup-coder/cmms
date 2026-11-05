package com.grash.repository;

import com.grash.model.PartQuantity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

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
    Collection<PartQuantity> findForDocumentByPurchaseOrder_Id(Long id);

    boolean existsBySite_Id(Long siteId);

    void deleteByCompany_IdAndIsDemoTrue(Long companyId);
}
