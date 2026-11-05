package com.grash.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@Schema(description = "DTO for patching part quantity")
public class PartQuantityPatchDTO {
    @Schema(description = "Quantity value (must be positive)")
    @DecimalMin(value = "0.0", inclusive = true)
    private Double quantity;

    @DecimalMin(value = "0.0", inclusive = true)
    @Digits(integer = 15, fraction = 4)
    private BigDecimal purchaseUnitPrice;

    private Long siteId;
}

