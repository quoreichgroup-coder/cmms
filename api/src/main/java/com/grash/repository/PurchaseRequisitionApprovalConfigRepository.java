package com.grash.repository;

import com.grash.model.PurchaseRequisitionApprovalConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PurchaseRequisitionApprovalConfigRepository
        extends JpaRepository<PurchaseRequisitionApprovalConfig, Long> {
    Optional<PurchaseRequisitionApprovalConfig> findByCompany_Id(Long companyId);
}
