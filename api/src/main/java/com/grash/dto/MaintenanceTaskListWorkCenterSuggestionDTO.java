package com.grash.dto;

import java.math.BigDecimal;

/** Defaults that are consistent across visible operations using a work center. */
public record MaintenanceTaskListWorkCenterSuggestionDTO(String workCenter, String controlKey,
                                                         BigDecimal workers, String workUnit,
                                                         String durationUnit, String systemCondition) {}
