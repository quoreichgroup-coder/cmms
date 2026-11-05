package com.grash.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record MaintenanceTaskListConfigurationDTO(
        @Min(1) @Max(999999) int operationNumberStart,
        @Min(1) @Max(999999) int operationNumberIncrement,
        @NotNull @DecimalMin("0.01") @DecimalMax("999999") BigDecimal defaultWorkers,
        @NotBlank @Pattern(regexp = "(?i)H|HR|HRS|HOUR|HOURS|MIN|MINS|MINUTE|MINUTES|S|SEC|SECS|SECOND|SECONDS") String defaultWorkUnit,
        @NotBlank @Pattern(regexp = "(?i)H|HR|HRS|HOUR|HOURS|MIN|MINS|MINUTE|MINUTES|S|SEC|SECS|SECOND|SECONDS") String defaultDurationUnit,
        @Size(max = 4000) String workCenterCatalog,
        @Size(max = 4000) String controlKeyCatalog) {
    public MaintenanceTaskListConfigurationDTO(int operationNumberStart, int operationNumberIncrement,
            BigDecimal defaultWorkers, String defaultWorkUnit, String defaultDurationUnit) {
        this(operationNumberStart, operationNumberIncrement, defaultWorkers, defaultWorkUnit,
                defaultDurationUnit, "", "");
    }
}
