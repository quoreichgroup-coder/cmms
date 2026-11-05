package com.grash.repository;

import com.grash.model.PurchaseRequisitionLine;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PurchaseRequisitionLineRepository extends JpaRepository<PurchaseRequisitionLine, Long> {
    boolean existsBySite_Id(Long siteId);
}
