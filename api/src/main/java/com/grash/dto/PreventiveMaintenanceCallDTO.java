package com.grash.dto;

import com.grash.dto.workOrder.WorkOrderMiniDTO;
import com.grash.model.enums.PreventiveMaintenanceCallStatus;
import lombok.Data;

import java.util.Date;
import java.util.List;

@Data
public class PreventiveMaintenanceCallDTO {
    private Long id;
    private Double dueValue;
    private Date dueDate;
    private Date originalDueDate;
    private Date rescheduledFor;
    private String callType;
    private String unit;
    private Double readingValue;
    private List<String> triggeredCycleCodes;
    private List<String> triggeredCycleNames;
    private Date createdAt;
    private PreventiveMaintenanceCallStatus status;
    private WorkOrderMiniDTO workOrder;
    private List<PreventiveMaintenanceCallRescheduleDTO> rescheduleHistory;
}
