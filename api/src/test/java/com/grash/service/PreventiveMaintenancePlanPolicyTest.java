package com.grash.service;

import com.grash.model.PreventiveMaintenancePlanConfiguration;
import com.grash.model.PreventiveMaintenancePlanConfiguration.Package;
import com.grash.model.Schedule;
import com.grash.model.enums.RecurrenceType;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Date;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class PreventiveMaintenancePlanPolicyTest {
    @Test
    void strategyPackagesAreDueAtTheirConfiguredBaseCycleMultiples() {
        PreventiveMaintenancePlanConfiguration config = new PreventiveMaintenancePlanConfiguration();
        config.setMode(PreventiveMaintenancePlanConfiguration.Mode.STRATEGY);
        Package weekly = packageOf("weekly", 1);
        Package monthly = packageOf("monthly", 4);
        Package annual = packageOf("annual", 52);
        config.setPackages(List.of(weekly, monthly, annual));

        assertEquals(List.of(weekly), PreventiveMaintenancePlanPolicy.duePackages(config, 1));
        assertEquals(List.of(weekly, monthly), PreventiveMaintenancePlanPolicy.duePackages(config, 4));
        assertEquals(List.of(weekly, monthly, annual), PreventiveMaintenancePlanPolicy.duePackages(config, 52));
        assertTrue(PreventiveMaintenancePlanPolicy.duePackages(config, 0).isEmpty());
    }

    @Test
    void orReturnsOnlyCyclesTriggeredNowAndAndWaitsForEveryCycle() {
        PreventiveMaintenancePlanConfiguration config = multiCounter();
        config.setCombination(PreventiveMaintenancePlanConfiguration.Combination.OR);
        assertEquals(Set.of("calendar"), PreventiveMaintenancePlanPolicy.triggeredCycles(config,
                List.of("calendar"), List.of()));

        config.setCombination(PreventiveMaintenancePlanConfiguration.Combination.AND);
        assertTrue(PreventiveMaintenancePlanPolicy.triggeredCycles(config,
                List.of("calendar"), List.of()).isEmpty());
        assertEquals(Set.of("calendar", "hours"), PreventiveMaintenancePlanPolicy.triggeredCycles(config,
                List.of("hours"), List.of("calendar")));
    }

    @Test
    void calendarCycleNumberUsesCompanyLocalDateAndConfiguredFrequency() {
        Schedule schedule = new Schedule();
        schedule.setStartsOn(Date.from(LocalDate.of(2026, 1, 31).atStartOfDay(ZoneId.of("UTC")).toInstant()));
        schedule.setFrequency(3);
        schedule.setRecurrenceType(RecurrenceType.MONTHLY);
        assertEquals(1, PreventiveMaintenancePlanPolicy.calendarCycleNumber(schedule,
                Date.from(LocalDate.of(2026, 1, 31).atStartOfDay(ZoneId.of("UTC")).toInstant()), ZoneId.of("UTC")));
        assertEquals(2, PreventiveMaintenancePlanPolicy.calendarCycleNumber(schedule,
                Date.from(LocalDate.of(2026, 4, 30).atStartOfDay(ZoneId.of("UTC")).toInstant()), ZoneId.of("UTC")));
    }

    @Test
    void meterCycleNumberUsesReferenceAndInterval() {
        assertEquals(1, PreventiveMaintenancePlanPolicy.meterCycleNumber(50, 100, 150));
        assertEquals(3, PreventiveMaintenancePlanPolicy.meterCycleNumber(50, 100, 350));
        assertEquals(0, PreventiveMaintenancePlanPolicy.meterCycleNumber(50, 100, 49));
    }

    @Test
    void rejectsStrategyPackagesWithoutTasksAndDuplicatePackageCodes() {
        PreventiveMaintenancePlanConfiguration config = new PreventiveMaintenancePlanConfiguration();
        config.setMode(PreventiveMaintenancePlanConfiguration.Mode.STRATEGY);
        Package empty = packageOf("weekly", 1);
        empty.setTaskBaseIds(List.of());
        config.setPackages(List.of(empty));
        assertTrue(PreventiveMaintenancePlanPolicy.validate(config).isPresent());

        Package duplicate = packageOf("WEEKLY", 4);
        config.setPackages(List.of(packageOf("weekly", 1), duplicate));
        assertTrue(PreventiveMaintenancePlanPolicy.validate(config).isPresent());
    }

    @Test
    void acceptsWellFormedMeterMultiCounterPlan() {
        PreventiveMaintenancePlanConfiguration config = multiCounter();
        config.setCombination(PreventiveMaintenancePlanConfiguration.Combination.AND);
        config.getCycles().forEach(cycle -> {
            cycle.setDimension(PreventiveMaintenancePlanConfiguration.Dimension.METER);
            cycle.setInterval(100);
            cycle.setMeterId(10L);
            cycle.setReferenceValue(0d);
            cycle.setTaskBaseIds(List.of(11L));
        });
        assertTrue(PreventiveMaintenancePlanPolicy.validate(config).isEmpty());
    }

    private static Package packageOf(String code, int cadence) {
        Package item = new Package();
        item.setCode(code);
        item.setEveryBaseCycles(cadence);
        item.setTaskBaseIds(List.of((long) cadence));
        return item;
    }

    private static PreventiveMaintenancePlanConfiguration multiCounter() {
        PreventiveMaintenancePlanConfiguration config = new PreventiveMaintenancePlanConfiguration();
        config.setMode(PreventiveMaintenancePlanConfiguration.Mode.MULTI_COUNTER);
        PreventiveMaintenancePlanConfiguration.Cycle calendar = new PreventiveMaintenancePlanConfiguration.Cycle();
        calendar.setCode("calendar");
        PreventiveMaintenancePlanConfiguration.Cycle meter = new PreventiveMaintenancePlanConfiguration.Cycle();
        meter.setCode("hours");
        config.setCycles(List.of(calendar, meter));
        return config;
    }
}
