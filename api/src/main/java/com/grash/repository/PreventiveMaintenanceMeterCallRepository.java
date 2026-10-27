package com.grash.repository;

import com.grash.model.PreventiveMaintenanceMeterCall;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.Optional;
import com.grash.model.enums.PreventiveMaintenanceCallStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PreventiveMaintenanceMeterCallRepository extends JpaRepository<PreventiveMaintenanceMeterCall, Long> {
    @Query("select c.status as status, c.callType as callType, count(c) as count " +
            "from PreventiveMaintenanceMeterCall c " +
            "where c.schedule.preventiveMaintenance.company.id = :companyId " +
            "and coalesce(c.rescheduledFor, c.dueDate) >= :start " +
            "and coalesce(c.rescheduledFor, c.dueDate) < :endExclusive " +
            "group by c.status, c.callType")
    java.util.List<PreventiveMaintenanceCallAnalyticsRow> aggregateCallsByStatusAndType(
            @Param("companyId") Long companyId, @Param("start") java.util.Date start,
            @Param("endExclusive") java.util.Date endExclusive);

    @Query("select c.status as status, c.callType as callType, count(c) as count " +
            "from PreventiveMaintenanceMeterCall c " +
            "where c.schedule.preventiveMaintenance.company.id = :companyId " +
            "and (c.schedule.preventiveMaintenance.site is null " +
            "or c.schedule.preventiveMaintenance.site.id in :siteIds) " +
            "and coalesce(c.rescheduledFor, c.dueDate) >= :start " +
            "and coalesce(c.rescheduledFor, c.dueDate) < :endExclusive " +
            "group by c.status, c.callType")
    java.util.List<PreventiveMaintenanceCallAnalyticsRow> aggregateCallsByStatusAndTypeForSites(
            @Param("companyId") Long companyId, @Param("siteIds") java.util.List<Long> siteIds,
            @Param("start") java.util.Date start, @Param("endExclusive") java.util.Date endExclusive);

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
