package com.grash.model;

import com.grash.model.abstracts.Audit;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
@Data
@NoArgsConstructor
@Table(name = "preventive_maintenance_plan_cycle_state", uniqueConstraints = @UniqueConstraint(
        name = "uk_pm_plan_cycle_state", columnNames = {"schedule_id", "cycle_code"}))
public class PreventiveMaintenancePlanCycleState extends Audit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "schedule_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Schedule schedule;

    @Column(name = "cycle_code", nullable = false, length = 100)
    private String cycleCode;

    @Column(name = "last_triggered_ordinal", nullable = false)
    private long lastTriggeredOrdinal;

    @Column(name = "pending_due", nullable = false)
    private boolean pendingDue;
}
