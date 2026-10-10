package com.grash.repository;

import com.grash.model.PreventiveMaintenanceCallReschedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface PreventiveMaintenanceCallRescheduleRepository
        extends JpaRepository<PreventiveMaintenanceCallReschedule, Long> {
    List<PreventiveMaintenanceCallReschedule> findByCall_IdInOrderByCreatedAtAsc(Collection<Long> callIds);
}
