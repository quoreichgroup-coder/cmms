package com.grash.dto;

import com.grash.model.Asset;
import com.grash.model.Meter;
import com.grash.model.User;
import com.grash.model.enums.TaskType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotNull;

import java.util.List;

@Data
@NoArgsConstructor
@Schema(description = "Base DTO for task definitions")
public class TaskBaseDTO {
    @Schema(description = "Client task-template identifier used to preserve package assignment links")
    private Long id;

    @Schema(description = "Existing work-order task identifier used only when editing that work order")
    private Long workOrderTaskId;

    @Schema(description = "Task label or title")
    @NotNull
    private String label;

    @Schema(description = "Type of task")
    private TaskType taskType = TaskType.SUBTASK;

    @Schema(description = "Assigned user")
    private User user;

    @Schema(description = "Associated asset")
    private Asset asset;

    @Schema(description = "Associated meter")
    private Meter meter;

    @Schema(description = "List of task options")
    private List<String> options;
}

