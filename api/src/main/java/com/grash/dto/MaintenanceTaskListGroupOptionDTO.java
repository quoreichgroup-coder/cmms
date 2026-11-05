package com.grash.dto;

public record MaintenanceTaskListGroupOptionDTO(
        String groupCode,
        String description,
        String taskListType,
        Long counterCount,
        Long assetId,
        Long locationId) {}
