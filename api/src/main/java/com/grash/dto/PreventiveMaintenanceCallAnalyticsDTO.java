package com.grash.dto;

import com.grash.model.enums.PreventiveMaintenanceCallStatus;
import com.grash.model.enums.ScheduleTriggerType;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PreventiveMaintenanceCallAnalyticsDTO {
    private PreventiveMaintenanceCallStatus status;
    private ScheduleTriggerType callType;
    private long count;
}
