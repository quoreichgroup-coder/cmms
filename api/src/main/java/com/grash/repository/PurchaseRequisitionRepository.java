package com.grash.repository;

import com.grash.model.PurchaseRequisition;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PurchaseRequisitionRepository extends JpaRepository<PurchaseRequisition, Long>,
        JpaSpecificationExecutor<PurchaseRequisition> {
    Optional<PurchaseRequisition> findByIdAndCompany_Id(Long id, Long companyId);

    @Query("select distinct requisition from PurchaseRequisition requisition left join fetch requisition.lines " +
            "where requisition.id = :id and requisition.company.id = :companyId")
    Optional<PurchaseRequisition> findWithLinesByIdAndCompany(@Param("id") Long id,
                                                              @Param("companyId") Long companyId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select requisition from PurchaseRequisition requisition " +
            "where requisition.id = :id and requisition.company.id = :companyId")
    Optional<PurchaseRequisition> findByIdForUpdateAndCompany(@Param("id") Long id,
                                                              @Param("companyId") Long companyId);
}
