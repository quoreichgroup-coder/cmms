package com.grash.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record MaintenanceTaskListDTO(
        Long id,
        @JsonProperty(access = JsonProperty.Access.READ_ONLY)
        @Schema(description = "Automatically assigned task-list group; immutable after creation",
                accessMode = Schema.AccessMode.READ_ONLY)
        @Size(max = 80) String groupCode,
        @JsonProperty(access = JsonProperty.Access.READ_ONLY)
        @Schema(description = "Automatically generated for this task-list group and immutable after creation",
                accessMode = Schema.AccessMode.READ_ONLY)
        @Size(max = 20) String groupCounter,
        @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
        String existingGroupCode,
        @NotBlank @Size(max = 200) String description,
        @NotBlank @Size(max = 40) String taskListType,
        Long assetId,
        Long locationId,
        String workCenter,
        LocalDate validFrom,
        LocalDate validTo,
        @NotBlank @Size(max = 20) String status,
        @NotNull @Valid List<OperationDTO> operations,
        Long createdBy) {

    public record OperationDTO(
            Long id,
            @NotBlank @Size(max = 20) String operationNumber,
            @NotBlank @Size(max = 200) String shortDescription,
            String longText,
            String workCenter,
            String controlKey,
            @Positive BigDecimal workers,
            @Positive BigDecimal plannedWork,
            String workUnit,
            @Positive BigDecimal duration,
            String durationUnit,
            String systemCondition,
            int operationOrder,
            @Valid List<MaterialDTO> materials) {}

    public record MaterialDTO(
            Long id,
            @NotNull Long partId,
            @Positive @NotNull BigDecimal quantity,
            String unit,
            String storageLocation,
            @PositiveOrZero BigDecimal estimatedUnitCost) {}
}
