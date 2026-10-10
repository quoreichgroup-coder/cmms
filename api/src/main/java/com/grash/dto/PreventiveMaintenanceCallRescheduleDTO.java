package com.grash.dto;

import lombok.Data;

import java.util.Date;

@Data
public class PreventiveMaintenanceCallRescheduleDTO {
    private Long id;
    private Date previousDueDate;
    private Date rescheduledFor;
    private String reason;
    private Long actorUserId;
    private String actorName;
    private Date createdAt;
}
