package com.grash.model;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.Embeddable;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShiftException {

    @Schema(description = "The specific date for this exception")
    @NotNull
    private LocalDate exceptionDate;

    @Schema(description = "Availability in minutes for this date")
    @Max(60 * 24)
    @Min(0)
    private int availabilityMinutes;

    @Schema(description = "Local workday start time in HH:mm format")
    @NotNull
    @Pattern(regexp = "(?:[01]\\d|2[0-3]):[0-5]\\d")
    private String startTime = "08:00";

    @Schema(description = "Whether this date is enabled")
    private boolean enabled = true;

    public ShiftException(LocalDate exceptionDate, int availabilityMinutes, boolean enabled) {
        this(exceptionDate, availabilityMinutes, "08:00", enabled);
    }
}
