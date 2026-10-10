package com.grash.repository;

import com.grash.model.Schedule;
import com.grash.model.enums.ScheduleTriggerType;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;

public interface ScheduleRepository extends JpaRepository<Schedule, Long> {
    @Query("SELECT s from Schedule s where s.preventiveMaintenance.company.id = :x ")
    Collection<Schedule> findByCompany_Id(@Param("x") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Collection<Schedule> findByMeter_IdAndTriggerTypeAndDisabledFalseOrderById(Long meterId,
                                                                                ScheduleTriggerType triggerType);

    @Query(value = "SELECT s.* FROM schedule s "
            + "JOIN preventive_maintenance pm ON pm.id = s.preventive_maintenance_id "
            + "WHERE pm.company_id = :companyId AND s.trigger_type = 'METER' AND s.disabled = false "
            + "AND s.plan_configuration IS NOT NULL "
            + "AND EXISTS (SELECT 1 FROM jsonb_array_elements((s.plan_configuration::jsonb)->'cycles') cycle_item "
            + "WHERE cycle_item->>'dimension' = 'METER' AND cycle_item->>'meterId' = CAST(:meterId AS text)) "
            + "ORDER BY s.id FOR UPDATE OF s", nativeQuery = true)
    Collection<Schedule> findMultiCounterSchedulesByCompanyAndMeterId(@Param("companyId") Long companyId,
                                                                       @Param("meterId") Long meterId);

    void deleteByPreventiveMaintenanceCompany_IdAndIsDemoTrue(Long companyId);

    @Query(value = "SELECT s.* FROM schedule s " +
            "LEFT JOIN (" +
            "    SELECT parent_preventive_maintenance_id, " +
            "           COUNT(*) as total, " +
            "           MAX(first_time_to_react) as last_react " +
            "    FROM (" +
            "        SELECT parent_preventive_maintenance_id, first_time_to_react " +
            "        FROM work_order " +
            "        WHERE parent_preventive_maintenance_id IS NOT NULL " +
            "    ) pm_work_orders " +
            "    GROUP BY parent_preventive_maintenance_id " +
            ") wo_stats ON s.preventive_maintenance_id = wo_stats.parent_preventive_maintenance_id " +
            "WHERE s.disabled = false " +
            "AND s.trigger_type = 'CALENDAR' " +
            "AND (s.ends_on IS NULL OR s.ends_on > CURRENT_DATE) " +
            "AND (wo_stats.total IS NULL OR wo_stats.total < 10 OR wo_stats.last_react IS NOT NULL)", nativeQuery =
            true)
    Collection<Schedule> findByActive();

    @Modifying
    @Query("""
                update Schedule s
                set s.disabled = true
                where s.preventiveMaintenance.company.id = :companyId
            """)
    void updateDisabledTrueByCompanyId(@Param("companyId") Long companyId);
}
