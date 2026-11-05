package com.grash.repository;

import com.grash.model.ProcurementApprovalEvent;
import org.springframework.data.jpa.repository.*;
import java.util.List;

public interface ProcurementApprovalEventRepository extends JpaRepository<ProcurementApprovalEvent, Long>, JpaSpecificationExecutor<ProcurementApprovalEvent> {
    List<ProcurementApprovalEvent> findByInstanceIdOrderByLevelNumberAsc(Long instanceId);
    List<ProcurementApprovalEvent> findByCompany_IdAndDocumentTypeAndDocumentIdOrderByLevelNumberAsc(Long companyId, String documentType, Long documentId);
    List<ProcurementApprovalEvent> findByCompany_IdAndDocumentTypeAndDocumentIdOrderByCreatedAtAscIdAsc(Long companyId, String documentType, Long documentId);
}
