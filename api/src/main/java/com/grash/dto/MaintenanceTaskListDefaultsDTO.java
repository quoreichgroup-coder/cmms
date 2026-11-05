package com.grash.dto;

import java.util.List;
import java.math.BigDecimal;

/** Existing company values that can be reused as task-list defaults. */
public record MaintenanceTaskListDefaultsDTO(List<String> workCenters, List<String> controlKeys,
                                             List<String> workUnits, List<String> durationUnits,
                                             List<String> systemConditions,
                                             List<MaintenanceTaskListWorkCenterSuggestionDTO> workCenterDefaults,
                                             int operationNumberStart, int operationNumberIncrement,
                                             BigDecimal defaultWorkers, String defaultWorkUnit,
                                             String defaultDurationUnit) {}
