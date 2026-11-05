package com.grash.repository;

import com.grash.model.ProcurementApprovalPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.Optional;
import java.util.List;

public interface ProcurementApprovalPolicyRepository extends JpaRepository<ProcurementApprovalPolicy, Long>, JpaSpecificationExecutor<ProcurementApprovalPolicy> {
    Optional<ProcurementApprovalPolicy> findByIdAndCompany_Id(Long id, Long companyId);
    List<ProcurementApprovalPolicy> findAllByCompany_IdAndDocumentTypeAndStatusOrderByPriorityAscIdAsc(Long companyId, String type, String status);
    boolean existsByCompany_IdAndDocumentTypeAndActivatedAtIsNotNull(Long companyId, String type);
}
