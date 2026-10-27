package com.grash.model;

import com.grash.model.abstracts.Audit;
import com.grash.model.enums.PreventiveMaintenanceCallStatus;
import com.grash.model.enums.ScheduleTriggerType;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.Date;

@Entity
@Data
@NoArgsConstructor
@Table(name = "preventive_maintenance_meter_call", uniqueConstraints = {
        @UniqueConstraint(name = "uk_pm_meter_call_schedule_reading", columnNames = {"schedule_id", "reading_id"}),
        @UniqueConstraint(name = "uk_pm_meter_call_schedule_due_value", columnNames = {"schedule_id", "due_value"}),
        @UniqueConstraint(name = "uk_pm_meter_call_schedule_due_date", columnNames = {"schedule_id", "due_date"})
})
public class PreventiveMaintenanceMeterCall extends Audit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "schedule_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Schedule schedule;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reading_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Reading reading;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_order_id")
    private WorkOrder workOrder;

    @Column(name = "due_value")
    private Double dueValue;

    @Column(name = "due_date")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dueDate;

    @Column(name = "rescheduled_for")
    @Temporal(TemporalType.TIMESTAMP)
    private Date rescheduledFor;

    @Enumerated(EnumType.STRING)
    @Column(name = "call_type", nullable = false, length = 24)
    private ScheduleTriggerType callType = ScheduleTriggerType.METER;

    @Column(name = "reading_value")
    private Double readingValue;

    @Column(name = "triggered_cycle_codes", columnDefinition = "text")
    private String triggeredCycleCodes;

    @Column(name = "triggered_cycle_names", columnDefinition = "text")
    private String triggeredCycleNames;

    @Enumerated(EnumType.STRING)
    @Column(name = "call_status", nullable = false, length = 24)
    private PreventiveMaintenanceCallStatus status = PreventiveMaintenanceCallStatus.PLANNED;
}
