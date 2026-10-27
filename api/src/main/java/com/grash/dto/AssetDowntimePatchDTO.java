package com.grash.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;

import java.util.Date;

@Data
@NoArgsConstructor
@Schema(description = "DTO for patching asset downtime information")
public class AssetDowntimePatchDTO {
    @Schema(description = "Duration of the asset downtime")
    @Min(0)
    @Max(Integer.MAX_VALUE)
    private Long duration;

    @Schema(description = "Start date of the downtime")
    private Date startsOn;
}
