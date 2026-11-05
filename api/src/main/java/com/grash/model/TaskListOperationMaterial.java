package com.grash.model;

import com.grash.model.abstracts.CompanyAudit;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "task_list_operation_material")
@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true, exclude = {"operation", "part"})
public class TaskListOperationMaterial extends CompanyAudit {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "operation_id", nullable = false)
    private TaskListOperation operation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "part_id", nullable = false)
    @NotNull
    private Part part;

    @Positive
    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal quantity;

    @Column(length = 20)
    private String unit;

    @Column(name = "storage_location", length = 120)
    private String storageLocation;

    @Column(name = "estimated_unit_cost", precision = 14, scale = 4)
    private BigDecimal estimatedUnitCost;
}
