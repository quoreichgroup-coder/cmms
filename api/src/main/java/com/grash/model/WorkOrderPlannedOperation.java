package com.grash.model;

import com.grash.model.abstracts.CompanyAudit;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/** Immutable-at-creation copy of a task-list operation attached to a work order. */
@Entity
@Table(name = "work_order_planned_operation")
@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true, exclude = {"workOrder", "materials"})
public class WorkOrderPlannedOperation extends CompanyAudit {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "work_order_id", nullable = false)
    private WorkOrder workOrder;

    @Column(name = "operation_number", nullable = false, length = 20)
    private String operationNumber;
    @Column(name = "short_description", nullable = false, length = 200)
    private String shortDescription;
    @Column(name = "long_text", columnDefinition = "text")
    private String longText;
    @Column(name = "work_center", length = 120)
    private String workCenter;
    @Column(name = "control_key", length = 40)
    private String controlKey;
    @Column(precision = 10, scale = 2)
    private BigDecimal workers;
    @Column(name = "planned_work", precision = 12, scale = 3)
    private BigDecimal plannedWork;
    @Column(name = "work_unit", length = 20)
    private String workUnit;
    @Column(precision = 12, scale = 3)
    private BigDecimal duration;
    @Column(name = "duration_unit", length = 20)
    private String durationUnit;
    @Column(name = "system_condition", length = 80)
    private String systemCondition;
    @Column(name = "operation_order", nullable = false)
    private int operationOrder;

    @OneToMany(mappedBy = "operation", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<WorkOrderPlannedMaterial> materials = new ArrayList<>();
}
