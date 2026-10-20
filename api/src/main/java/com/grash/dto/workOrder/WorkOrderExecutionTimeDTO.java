package com.grash.dto.workOrder;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkOrderExecutionTimeDTO {
    private boolean measured;
    private boolean running;
    private Long elapsedSeconds;
}
