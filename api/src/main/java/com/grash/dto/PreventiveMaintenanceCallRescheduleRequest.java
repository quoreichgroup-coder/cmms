package com.grash.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.Date;

@Data
public class PreventiveMaintenanceCallRescheduleRequest {
    @NotNull
    private Date rescheduledFor;

    @NotBlank
    @Size(max = 1000)
    private String reason;
}
