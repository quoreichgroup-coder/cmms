package com.grash.repository;

import com.grash.model.WorkOrderLifecycleEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WorkOrderLifecycleEventRepository extends JpaRepository<WorkOrderLifecycleEvent, Long> {
    boolean existsByWorkOrder_Id(Long workOrderId);

    List<WorkOrderLifecycleEvent> findByWorkOrder_IdAndCompanyIdOrderByOccurredAtDescIdDesc(Long workOrderId,
                                                                                            Long companyId);

    List<WorkOrderLifecycleEvent> findByWorkOrder_IdAndCompanyIdOrderByOccurredAtAscIdAsc(Long workOrderId,
                                                                                           Long companyId);
}
