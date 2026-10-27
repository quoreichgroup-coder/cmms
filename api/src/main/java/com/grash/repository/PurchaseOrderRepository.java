package com.grash.repository;

import com.grash.model.PurchaseOrder;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.Optional;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long>, JpaSpecificationExecutor<PurchaseOrder> {
    Collection<PurchaseOrder> findByCompany_Id(@Param("x") Long id);

    Optional<PurchaseOrder> findByIdAndCompany_Id(Long id, Long companyId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select purchaseOrder from PurchaseOrder purchaseOrder " +
            "where purchaseOrder.id = :id and purchaseOrder.company.id = :companyId")
    Optional<PurchaseOrder> findByIdForUpdateAndCompany(@Param("id") Long id,
                                                        @Param("companyId") Long companyId);
}
