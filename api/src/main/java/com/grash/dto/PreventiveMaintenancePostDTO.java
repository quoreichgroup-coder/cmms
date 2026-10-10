package com.grash.dto;

import com.grash.dto.cutomField.CustomFieldValuePostDTO;
import com.grash.model.CustomFieldValue;
import com.grash.model.PreventiveMaintenancePlanConfiguration;
import com.grash.model.abstracts.WorkOrderBase;
import com.grash.model.enums.RecurrenceBasedOn;
import com.grash.model.enums.RecurrenceType;
import com.grash.model.enums.ScheduleTriggerType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotNull;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Data
@NoArgsConstructor
@Schema(description = "DTO for creating a new preventive maintenance schedule")
public class PreventiveMaintenancePostDTO extends WorkOrderBase {
    @Schema(description = "Start date of the maintenance")
    private Date startsOn;

    @Schema(description = "Name")
    @NotNull
    private String name;

    @Schema(description = "Frequency of recurrence")
    private Integer frequency;

    @Schema(description = "Due date delay")
    private Integer dueDateDelay;

    private Integer workOrderGenerationLeadDays = 0;

    @Schema(description = "End date of the maintenance")
    private Date endsOn;

    @Schema(description = "Recurrence type")
    private RecurrenceType recurrenceType;

    @Schema(description = "What the recurrence is based on")
    private RecurrenceBasedOn recurrenceBasedOn;

    @Schema(description = "Days of week for recurrence")
    private List<Integer> daysOfWeek = new ArrayList<>();

    private ScheduleTriggerType triggerType = ScheduleTriggerType.CALENDAR;

    private Long meterId;

    private Double meterCycleInterval;

    private Double meterReferenceValue;

    private Double meterEndValue;

    private PreventiveMaintenancePlanConfiguration planConfiguration;

    @Schema(description = "List of custom field values")
    private List<CustomFieldValuePostDTO> customFields = new ArrayList<>();


    @Override
    public List<CustomFieldValue> getCustomFieldValues() {
        return List.of();
    }
}
