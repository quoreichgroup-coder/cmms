package com.grash.model;

import com.grash.model.abstracts.CompanyAudit;
import jakarta.persistence.Column;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "task_list_operation", uniqueConstraints = @UniqueConstraint(
        name = "uk_task_list_operation_number", columnNames = {"task_list_id", "operation_number"}))
@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true, exclude = {"taskList", "materials"})
public class TaskListOperation extends CompanyAudit {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_list_id", nullable = false)
    private MaintenanceTaskList taskList;

    @NotBlank
    @Column(name = "operation_number", nullable = false, length = 20)
    private String operationNumber;

    @NotBlank
    @Column(name = "short_description", nullable = false, length = 200)
    private String shortDescription;

    @Column(name = "long_text", columnDefinition = "text")
    private String longText;

    @Column(name = "work_center", length = 120)
    private String workCenter;

    @Column(name = "control_key", length = 40)
    private String controlKey;

    @Positive
    @Column(precision = 10, scale = 2)
    private BigDecimal workers;

    @Positive
    @Column(name = "planned_work", precision = 12, scale = 3)
    private BigDecimal plannedWork;

    @Column(name = "work_unit", length = 20)
    private String workUnit;

    @Positive
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
    private List<TaskListOperationMaterial> materials = new ArrayList<>();
}
