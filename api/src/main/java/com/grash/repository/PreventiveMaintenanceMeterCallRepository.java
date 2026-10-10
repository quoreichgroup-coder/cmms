package com.grash.repository;

import com.grash.model.PreventiveMaintenanceMeterCall;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.Optional;
import com.grash.model.enums.PreventiveMaintenanceCallStatus;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PreventiveMaintenanceMeterCallRepository extends JpaRepository<PreventiveMaintenanceMeterCall, Long> {
    boolean existsBySchedule_IdAndReading_Id(Long scheduleId, Long readingId);

    Page<PreventiveMaintenanceMeterCall> findBySchedule_PreventiveMaintenance_Id(Long pmId, Pageable pageable);

    boolean existsBySchedule_IdAndDueValue(Long scheduleId, double dueValue);

    Optional<PreventiveMaintenanceMeterCall> findBySchedule_IdAndDueValue(Long scheduleId, double dueValue);

    Optional<PreventiveMaintenanceMeterCall> findBySchedule_IdAndDueDate(Long scheduleId, java.util.Date dueDate);

    Optional<PreventiveMaintenanceMeterCall> findByIdAndSchedule_PreventiveMaintenance_Company_Id(Long id,
                                                                                                  Long companyId);

    java.util.List<PreventiveMaintenanceMeterCall> findByStatusAndCallTypeAndRescheduledForAfter(
            PreventiveMaintenanceCallStatus status, com.grash.model.enums.ScheduleTriggerType callType,
            java.util.Date date);

    Page<PreventiveMaintenanceMeterCall> findBySchedule_PreventiveMaintenance_IdOrderByDueDateAscDueValueAsc(Long pmId, Pageable pageable);

    void deleteBySchedule_IdAndStatus(Long scheduleId, PreventiveMaintenanceCallStatus status);

    java.util.List<PreventiveMaintenanceMeterCall> findBySchedule_IdAndStatus(Long scheduleId, PreventiveMaintenanceCallStatus status);

    void deleteBySchedule_IdAndCallTypeAndStatus(Long scheduleId, com.grash.model.enums.ScheduleTriggerType callType,
                                                  PreventiveMaintenanceCallStatus status);

    java.util.List<PreventiveMaintenanceMeterCall> findBySchedule_IdAndCallTypeAndStatus(Long scheduleId,
                    com.grash.model.enums.ScheduleTriggerType callType, PreventiveMaintenanceCallStatus status);

    java.util.List<PreventiveMaintenanceMeterCall> findBySchedule_IdAndCallTypeAndDueDateIn(Long scheduleId,
                    com.grash.model.enums.ScheduleTriggerType callType, java.util.Collection<java.util.Date> dueDates);

    java.util.List<PreventiveMaintenanceMeterCall> findByStatusAndCallTypeAndRescheduledForNotNull(
            PreventiveMaintenanceCallStatus status, com.grash.model.enums.ScheduleTriggerType callType);
}
