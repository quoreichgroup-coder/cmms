package com.grash.model;

import com.grash.model.abstracts.CompanyAudit;
import jakarta.persistence.Column;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "maintenance_task_list", uniqueConstraints = @UniqueConstraint(
        name = "uk_task_list_company_group_counter", columnNames = {"company_id", "group_code", "group_counter"}))
@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class MaintenanceTaskList extends CompanyAudit {
    @NotBlank
    @Column(name = "group_code", nullable = false, length = 80)
    private String groupCode;

    @NotBlank
    @Column(name = "group_counter", nullable = false, length = 20)
    private String groupCounter;

    @NotBlank
    @Column(nullable = false, length = 200)
    private String description;

    @NotBlank
    @Column(name = "task_list_type", nullable = false, length = 40)
    private String taskListType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_id")
    private Asset asset;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id")
    private Location location;

    @Column(name = "work_center", length = 120)
    private String workCenter;

    @Column(name = "valid_from")
    private LocalDate validFrom;

    @Column(name = "valid_to")
    private LocalDate validTo;

    @Column(nullable = false, length = 20)
    private String status = "DRAFT";

    @OneToMany(mappedBy = "taskList", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("operationOrder ASC")
    private List<TaskListOperation> operations = new ArrayList<>();
}
