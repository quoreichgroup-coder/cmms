package com.grash.repository;

import com.grash.model.PreventiveMaintenancePlanCycleState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PreventiveMaintenancePlanCycleStateRepository
        extends JpaRepository<PreventiveMaintenancePlanCycleState, Long> {
    Optional<PreventiveMaintenancePlanCycleState> findBySchedule_IdAndCycleCode(Long scheduleId, String cycleCode);
    List<PreventiveMaintenancePlanCycleState> findBySchedule_Id(Long scheduleId);
    void deleteBySchedule_Id(Long scheduleId);
}
