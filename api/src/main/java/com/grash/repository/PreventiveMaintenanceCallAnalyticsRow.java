package com.grash.repository;

import com.grash.model.enums.PreventiveMaintenanceCallStatus;
import com.grash.model.enums.ScheduleTriggerType;

public interface PreventiveMaintenanceCallAnalyticsRow {
    PreventiveMaintenanceCallStatus getStatus();

    ScheduleTriggerType getCallType();

    Long getCount();
}
