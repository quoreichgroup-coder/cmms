package com.grash.model;

import com.grash.model.abstracts.DateAudit;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.Date;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "preventive_maintenance_call_reschedule")
public class PreventiveMaintenanceCallReschedule extends DateAudit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "call_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private PreventiveMaintenanceMeterCall call;

    @Column(name = "previous_due_date", nullable = false)
    @Temporal(TemporalType.TIMESTAMP)
    private Date previousDueDate;

    @Column(name = "rescheduled_for", nullable = false)
    @Temporal(TemporalType.TIMESTAMP)
    private Date rescheduledFor;

    @Column(name = "reason", nullable = false, length = 1000)
    private String reason;

    @Column(name = "actor_user_id", nullable = false)
    private Long actorUserId;

    @Column(name = "actor_name", nullable = false, length = 200)
    private String actorName;
}
