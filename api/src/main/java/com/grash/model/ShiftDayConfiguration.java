package com.grash.model;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.DayOfWeek;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShiftDayConfiguration {

    @Enumerated(EnumType.STRING)
    @Schema(description = "Day of the week")
    @NotNull
    private DayOfWeek dayOfWeek;

    @Schema(description = "Availability in minutes for this day")
    @Max(60 * 24)
    @Min(0)
    private int availabilityMinutes;

    @Schema(description = "Local workday start time in HH:mm format")
    @NotNull
    @Pattern(regexp = "(?:[01]\\d|2[0-3]):[0-5]\\d")
    private String startTime = "08:00";

    private boolean enabled = true;

    public ShiftDayConfiguration(DayOfWeek dayOfWeek, int availabilityMinutes, boolean enabled) {
        this(dayOfWeek, availabilityMinutes, "08:00", enabled);
    }
}
