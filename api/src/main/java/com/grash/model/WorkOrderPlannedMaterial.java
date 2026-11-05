package com.grash.model;

import com.grash.model.abstracts.CompanyAudit;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/** Planning snapshot only: this is deliberately separate from stock reservation/issue records. */
@Entity
@Table(name = "work_order_planned_material")
@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true, exclude = "operation")
public class WorkOrderPlannedMaterial extends CompanyAudit {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "operation_id", nullable = false)
    private WorkOrderPlannedOperation operation;
    @Column(name = "part_id")
    private Long partId;
    @Column(name = "part_code", length = 120)
    private String partCode;
    @Column(name = "part_name", length = 255)
    private String partName;
    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal quantity;
    @Column(length = 20)
    private String unit;
    @Column(name = "storage_location", length = 120)
    private String storageLocation;
    @Column(name = "estimated_unit_cost", precision = 14, scale = 4)
    private BigDecimal estimatedUnitCost;
}
