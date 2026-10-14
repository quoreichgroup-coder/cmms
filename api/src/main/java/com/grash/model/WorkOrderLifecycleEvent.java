package com.grash.model;

import com.grash.model.enums.Status;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

import java.util.Date;

@Entity
@Immutable
@Getter
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
@Table(name = "work_order_lifecycle_event", indexes = {
        @Index(name = "idx_wo_lifecycle_event_wo_time", columnList = "work_order_id, occurred_at"),
        @Index(name = "idx_wo_lifecycle_event_company", columnList = "company_id")
})
public class WorkOrderLifecycleEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "work_order_id", nullable = false, updatable = false)
    private WorkOrder workOrder;

    @Column(name = "company_id", nullable = false, updatable = false)
    private Long companyId;

    @Enumerated(EnumType.STRING)
    @Column(name = "previous_status", nullable = false, updatable = false, length = 32)
    private Status previousStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", nullable = false, updatable = false, length = 32)
    private Status newStatus;

    @Column(name = "actor_user_id", nullable = false, updatable = false)
    private Long actorUserId;

    @Column(name = "actor_name", nullable = false, updatable = false, length = 200)
    private String actorName;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "occurred_at", nullable = false, updatable = false)
    private Date occurredAt;

    @Column(name = "reason", updatable = false, length = 1000)
    private String reason;

    public WorkOrderLifecycleEvent(WorkOrder workOrder, Status previousStatus, Status newStatus,
                                   User actor, Date occurredAt, String reason) {
        this.workOrder = workOrder;
        this.companyId = workOrder.getCompany().getId();
        this.previousStatus = previousStatus;
        this.newStatus = newStatus;
        this.actorUserId = actor.getId();
        this.actorName = actor.getFullName();
        this.occurredAt = new Date(occurredAt.getTime());
        this.reason = reason;
    }
}
