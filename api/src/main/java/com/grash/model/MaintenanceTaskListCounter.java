package com.grash.model;

import com.grash.model.abstracts.CompanyAudit;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

/** Durable high-water mark for SAP-style task-list group counters. */
@Entity
@Table(name = "maintenance_task_list_counter", uniqueConstraints = @UniqueConstraint(
        name = "uk_task_list_counter_company_group", columnNames = {"company_id", "group_code"}))
@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class MaintenanceTaskListCounter extends CompanyAudit {
    @Column(name = "group_code", nullable = false, length = 80)
    private String groupCode;

    /** Next counter to allocate, starting at one. */
    @Column(name = "next_counter", nullable = false)
    private int nextCounter = 1;
}
