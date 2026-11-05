package com.grash.repository;

import com.grash.model.WorkOrderPlannedOperation;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface WorkOrderPlannedOperationRepository extends JpaRepository<WorkOrderPlannedOperation, Long> {
    @EntityGraph(attributePaths = "materials")
    List<WorkOrderPlannedOperation> findByWorkOrder_IdIn(Collection<Long> workOrderIds);
}
