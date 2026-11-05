package com.grash.dto;

import java.time.LocalDate;

/** Lightweight task-list identity used by selectors that do not need operations or materials. */
public record MaintenanceTaskListOptionDTO(
        Long id,
        String groupCode,
        String groupCounter,
        String description,
        String taskListType,
        Long assetId,
        Long locationId,
        String status,
        LocalDate validFrom,
        LocalDate validTo) {}
