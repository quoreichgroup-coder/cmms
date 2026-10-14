package com.grash.dto.workOrder;

import com.grash.model.WorkOrderLifecycleEvent;
import com.grash.model.enums.Status;
import lombok.Data;

import java.util.Date;

@Data
public class WorkOrderLifecycleEventShowDTO {
    private Long id;
    private Status previousStatus;
    private Status newStatus;
    private Long actorUserId;
    private String actorName;
    private Date occurredAt;
    private String reason;

    public WorkOrderLifecycleEventShowDTO(WorkOrderLifecycleEvent event) {
        this.id = event.getId();
        this.previousStatus = event.getPreviousStatus();
        this.newStatus = event.getNewStatus();
        this.actorUserId = event.getActorUserId();
        this.actorName = event.getActorName();
        this.occurredAt = event.getOccurredAt();
        this.reason = event.getReason();
    }
}
