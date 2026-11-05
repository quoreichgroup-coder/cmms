package com.grash.model;

import com.grash.model.abstracts.CompanyAudit;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "maintenance_task_list_configuration", uniqueConstraints =
        @UniqueConstraint(name = "uk_task_list_configuration_company", columnNames = "company_id"))
@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class MaintenanceTaskListConfiguration extends CompanyAudit {
    @Min(1)
    @Max(999999)
    @Column(name = "operation_number_start", nullable = false)
    private int operationNumberStart = 10;

    @Min(1)
    @Max(999999)
    @Column(name = "operation_number_increment", nullable = false)
    private int operationNumberIncrement = 10;

    @NotNull
    @DecimalMin(value = "0.01")
    @Column(name = "default_workers", nullable = false, precision = 10, scale = 2)
    private BigDecimal defaultWorkers = BigDecimal.ONE;

    @NotBlank
    @Size(max = 20)
    @Column(name = "default_work_unit", nullable = false, length = 20)
    private String defaultWorkUnit = "H";

    @NotBlank
    @Size(max = 20)
    @Column(name = "default_duration_unit", nullable = false, length = 20)
    private String defaultDurationUnit = "H";

    @Column(name = "work_center_catalog", columnDefinition = "text")
    private String workCenterCatalog = "";

    @Column(name = "control_key_catalog", columnDefinition = "text")
    private String controlKeyCatalog = "";
}
