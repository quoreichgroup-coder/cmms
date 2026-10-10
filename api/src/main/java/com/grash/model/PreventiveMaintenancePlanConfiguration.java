package com.grash.model;

import com.grash.model.enums.RecurrenceType;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/** Optional SAP-inspired cycle configuration. Existing PMs keep their legacy Schedule behavior. */
@Data
@NoArgsConstructor
public class PreventiveMaintenancePlanConfiguration {
    private Mode mode = Mode.SINGLE;
    private Combination combination;
    private List<Package> packages = new ArrayList<>();
    private List<Cycle> cycles = new ArrayList<>();

    public enum Mode { SINGLE, STRATEGY, MULTI_COUNTER }
    public enum Combination { OR, AND }
    public enum Dimension { CALENDAR, METER }

    @Data
    @NoArgsConstructor
    public static class Package {
        private String code;
        private String name;
        /** Package cadence as a positive multiple of the strategy's base cycle. */
        private int everyBaseCycles;
        private List<Long> taskBaseIds = new ArrayList<>();
    }

    @Data
    @NoArgsConstructor
    public static class Cycle {
        private String code;
        private String name;
        private Dimension dimension;
        /** Calendar cadence in units of recurrenceType, or meter interval in meter units. */
        private double interval;
        private RecurrenceType recurrenceType;
        private Long meterId;
        private Double referenceValue;
        private Double endValue;
        private List<Long> taskBaseIds = new ArrayList<>();
    }
}
