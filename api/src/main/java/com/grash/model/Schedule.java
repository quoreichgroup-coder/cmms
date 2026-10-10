package com.grash.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.grash.exception.CustomException;
import com.grash.model.abstracts.Audit;
import com.grash.model.enums.RecurrenceBasedOn;
import com.grash.model.enums.RecurrenceType;
import com.grash.model.enums.ScheduleTriggerType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.springframework.http.HttpStatus;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Entity
@Data
@NoArgsConstructor
@Schema(description = "Schedule entity defining recurrence patterns for preventive maintenance")
public class Schedule extends Audit {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Schema(description = "Unique identifier", accessMode = Schema.AccessMode.READ_ONLY)
    private Long id;

    @Schema(description = "Whether the schedule is disabled")
    private boolean disabled;

    @Enumerated(EnumType.STRING)
    @NotNull
    private ScheduleTriggerType triggerType = ScheduleTriggerType.CALENDAR;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meter_id")
    @JsonIgnore
    @ToString.Exclude
    private Meter meter;

    private Double meterCycleInterval;

    private Double meterReferenceValue;

    private Double meterEndValue;

    private Double nextMeterValue;

    @JsonProperty("meterId")
    @Transient
    public Long getMeterId() {
        return meter == null ? null : meter.getId();
    }

    @JsonProperty("meterName")
    @Transient
    public String getMeterName() { return meter == null ? null : meter.getName(); }

    @JsonProperty("meterUnit")
    @Transient
    public String getMeterUnit() { return meter == null ? null : meter.getUnit(); }

    @NotNull
    @Schema(description = "Start date of the schedule", requiredMode = Schema.RequiredMode.REQUIRED)
    private Date startsOn = new Date();

    @NotNull
    @Schema(description = "Frequency value (e.g., every X days/weeks)", requiredMode = Schema.RequiredMode.REQUIRED)
    private int frequency = 1; //day

    @Schema(description = "End date of the schedule")
    private Date endsOn;

    @Schema(description = "Delay for due date in days")
    private Integer dueDateDelay;

    @Column(name = "work_order_generation_lead_days", nullable = false)
    @Schema(description = "Generate scheduled work orders this many days before their planned due date")
    private int workOrderGenerationLeadDays = 0;

    @Schema(description = "Indicates whether this is a demo schedule")
    private boolean isDemo;

    @Enumerated(EnumType.STRING)
    @NotNull
    @Schema(description = "Type of recurrence", requiredMode = Schema.RequiredMode.REQUIRED)
    private RecurrenceType recurrenceType = RecurrenceType.DAILY;

    @Enumerated(EnumType.STRING)
    @NotNull
    @Schema(description = "What the recurrence is based on", requiredMode = Schema.RequiredMode.REQUIRED)
    private RecurrenceBasedOn recurrenceBasedOn = RecurrenceBasedOn.SCHEDULED_DATE;

    @ElementCollection
    @Schema(description = "Days of week for weekly recurrence (0 = Monday)")
    private List<Integer> daysOfWeek = new ArrayList<>();//0 monday

    /** Strategy packages or a multi-counter cycle set; null preserves the legacy single-cycle PM. */
    @Convert(converter = PreventiveMaintenancePlanConfigurationConverter.class)
    @Column(name = "plan_configuration", columnDefinition = "text")
    private PreventiveMaintenancePlanConfiguration planConfiguration;

    @OneToOne(fetch = FetchType.LAZY)
    @JsonIgnore
    @OnDelete(action = OnDeleteAction.CASCADE)
    @NotNull
    @ToString.Exclude
    private PreventiveMaintenance preventiveMaintenance;

    public Schedule(PreventiveMaintenance preventiveMaintenance) {
        this.preventiveMaintenance = preventiveMaintenance;
    }

    public void setFrequency(int frequency) {
        if (frequency < 1) throw new CustomException("Frequency should not be less than 1", HttpStatus.NOT_ACCEPTABLE);
        this.frequency = frequency;
    }

    public void setDueDateDelay(Integer dueDateDelay) {
        if (dueDateDelay != null && dueDateDelay < 1)
            throw new CustomException("Due date delay should not be less than 1", HttpStatus.NOT_ACCEPTABLE);
        this.dueDateDelay = dueDateDelay;
    }

    public void setWorkOrderGenerationLeadDays(int days) {
        if (days < 0 || days > 365)
            throw new CustomException("Work order generation lead days must be between 0 and 365", HttpStatus.BAD_REQUEST);
        this.workOrderGenerationLeadDays = days;
    }
}
