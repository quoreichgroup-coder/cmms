package com.grash.repository;

import com.grash.model.WorkOrderMeterTrigger;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;

public interface WorkOrderMeterTriggerRepository extends JpaRepository<WorkOrderMeterTrigger, Long> {
    Collection<WorkOrderMeterTrigger> findByMeter_Id(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM WorkOrderMeterTrigger t WHERE t.meter.id = :meterId")
    Collection<WorkOrderMeterTrigger> findByMeterIdForUpdate(@Param("meterId") Long meterId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM WorkOrderMeterTrigger t WHERE t.id = :id")
    java.util.Optional<WorkOrderMeterTrigger> findByIdForUpdate(@Param("id") Long id);
}
