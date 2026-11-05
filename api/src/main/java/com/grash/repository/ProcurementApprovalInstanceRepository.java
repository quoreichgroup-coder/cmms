package com.grash.repository;

import com.grash.model.ProcurementApprovalInstance;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface ProcurementApprovalInstanceRepository extends JpaRepository<ProcurementApprovalInstance, Long> {
    Optional<ProcurementApprovalInstance> findByCompany_IdAndDocumentTypeAndDocumentId(Long companyId, String type, Long id);
    boolean existsByPolicyId(Long policyId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from ProcurementApprovalInstance i where i.company.id=:company and i.documentType=:type and i.documentId=:document")
    Optional<ProcurementApprovalInstance> lockDocument(@Param("company") Long company, @Param("type") String type, @Param("document") Long document);
}
