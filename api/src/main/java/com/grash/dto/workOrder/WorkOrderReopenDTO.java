package com.grash.dto.workOrder;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class WorkOrderReopenDTO {
    @NotBlank
    @Size(max = 1000)
    private String reason;
}
