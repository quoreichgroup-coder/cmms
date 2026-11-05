package com.grash.model;

import com.grash.model.abstracts.CompanyAudit;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

/** Company-scoped high-water mark for automatically assigned task-list group codes. */
@Entity
@Table(name = "maintenance_task_list_group_sequence", uniqueConstraints = @UniqueConstraint(
        name = "uk_task_list_group_sequence_company", columnNames = "company_id"))
@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class MaintenanceTaskListGroupSequence extends CompanyAudit {
    @Column(name = "next_group_number", nullable = false)
    private int nextGroupNumber = 1;
}
