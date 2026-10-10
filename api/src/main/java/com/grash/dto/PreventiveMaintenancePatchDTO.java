package com.grash.dto;

import com.grash.model.enums.RecurrenceBasedOn;
import com.grash.model.enums.RecurrenceType;
import com.grash.model.enums.ScheduleTriggerType;
import com.grash.model.PreventiveMaintenancePlanConfiguration;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Data
@NoArgsConstructor
@Schema(description = "DTO for patching preventive maintenance information")
public class PreventiveMaintenancePatchDTO extends WorkOrderBasePatchDTO {
    @Schema(description = "Name")
    private String name;

    private Date startsOn;
    private Date endsOn;
    private Integer frequency;
    private Integer dueDateDelay;
    private Integer workOrderGenerationLeadDays;
    private RecurrenceType recurrenceType;
    private RecurrenceBasedOn recurrenceBasedOn;
    private List<Integer> daysOfWeek;
    private ScheduleTriggerType triggerType;
    private Long meterId;
    private Double meterCycleInterval;
    private Double meterReferenceValue;
    private Double meterEndValue;
    private PreventiveMaintenancePlanConfiguration planConfiguration;
}
