package com.grash.service;

import com.grash.model.PreventiveMaintenancePlanConfiguration;
import com.grash.model.Schedule;
import com.grash.model.enums.RecurrenceType;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/** Pure rules shared by validation, forecasts and work-order generation. */
public final class PreventiveMaintenancePlanPolicy {
    private PreventiveMaintenancePlanPolicy() {}

    public static List<PreventiveMaintenancePlanConfiguration.Package> duePackages(
            PreventiveMaintenancePlanConfiguration configuration, long oneBasedBaseCycle) {
        if (configuration == null || configuration.getMode() != PreventiveMaintenancePlanConfiguration.Mode.STRATEGY
                || oneBasedBaseCycle < 1) return List.of();
        return Optional.ofNullable(configuration.getPackages()).orElse(List.of()).stream()
                .filter(item -> item.getEveryBaseCycles() > 0
                        && oneBasedBaseCycle % item.getEveryBaseCycles() == 0)
                .toList();
    }

    public static Optional<String> validate(PreventiveMaintenancePlanConfiguration configuration) {
        if (configuration == null || configuration.getMode() == null) return Optional.empty();
        if (configuration.getMode() == PreventiveMaintenancePlanConfiguration.Mode.SINGLE) return Optional.empty();
        if (configuration.getMode() == PreventiveMaintenancePlanConfiguration.Mode.STRATEGY) {
            List<PreventiveMaintenancePlanConfiguration.Package> packages = configuration.getPackages();
            if (packages == null || packages.isEmpty()) return Optional.of("A strategy needs at least one maintenance package.");
            Set<String> codes = new HashSet<>();
            for (PreventiveMaintenancePlanConfiguration.Package item : packages) {
                if (item == null || item.getCode() == null || !item.getCode().matches("[A-Za-z0-9_-]{1,100}")
                        || !codes.add(item.getCode().trim().toLowerCase(Locale.ROOT))) {
                    return Optional.of("Strategy package codes must be present and unique.");
                }
                if (item.getEveryBaseCycles() < 1) return Optional.of("Package cycle intervals must be positive.");
                if (item.getTaskBaseIds() == null || item.getTaskBaseIds().isEmpty()
                        || item.getTaskBaseIds().stream().anyMatch(Objects::isNull)) {
                    return Optional.of("Each strategy package must select at least one task template.");
                }
            }
            return Optional.empty();
        }
        if (configuration.getCombination() == null) return Optional.of("Choose how maintenance cycles are combined.");
        List<PreventiveMaintenancePlanConfiguration.Cycle> cycles = configuration.getCycles();
        if (cycles == null || cycles.size() < 2) return Optional.of("A multi-counter plan needs at least two cycles.");
        Set<String> codes = new HashSet<>();
        for (PreventiveMaintenancePlanConfiguration.Cycle cycle : cycles) {
            if (cycle == null || cycle.getCode() == null || !cycle.getCode().matches("[A-Za-z0-9_-]{1,100}")
                    || !codes.add(cycle.getCode().trim().toLowerCase(Locale.ROOT))) {
                return Optional.of("Multi-counter cycle codes must be present and unique.");
            }
            if (cycle.getDimension() == null || !Double.isFinite(cycle.getInterval()) || cycle.getInterval() <= 0) {
                return Optional.of("Every multi-counter cycle needs a dimension and a positive interval.");
            }
            if (cycle.getTaskBaseIds() == null || cycle.getTaskBaseIds().isEmpty()
                    || cycle.getTaskBaseIds().stream().anyMatch(Objects::isNull)) {
                return Optional.of("Each multi-counter cycle must select at least one task template.");
            }
            if (cycle.getDimension() == PreventiveMaintenancePlanConfiguration.Dimension.CALENDAR
                    && cycle.getRecurrenceType() == null) return Optional.of("Calendar cycles need a recurrence unit.");
            if (cycle.getDimension() == PreventiveMaintenancePlanConfiguration.Dimension.METER
                    && (cycle.getMeterId() == null || cycle.getReferenceValue() == null
                    || !Double.isFinite(cycle.getReferenceValue()) || cycle.getReferenceValue() < 0)) {
                return Optional.of("Meter cycles need a meter and a non-negative reference reading.");
            }
            if (cycle.getEndValue() != null && (!Double.isFinite(cycle.getEndValue())
                    || cycle.getReferenceValue() == null || cycle.getEndValue() <= cycle.getReferenceValue())) {
                return Optional.of("Cycle end readings must be greater than the reference reading.");
            }
        }
        return Optional.empty();
    }

    public static long calendarCycleNumber(Schedule schedule, Date occurrence, ZoneId zoneId) {
        if (schedule == null || occurrence == null || schedule.getStartsOn() == null) return 0;
        ZoneId zone = zoneId == null ? ZoneId.of("UTC") : zoneId;
        LocalDate start = schedule.getStartsOn().toInstant().atZone(zone).toLocalDate();
        LocalDate due = occurrence.toInstant().atZone(zone).toLocalDate();
        if (due.isBefore(start)) return 0;
        int frequency = Math.max(1, schedule.getFrequency());
        long elapsed;
        RecurrenceType type = schedule.getRecurrenceType();
        if (type == null) return 0;
        switch (type) {
            case DAILY -> elapsed = ChronoUnit.DAYS.between(start, due);
            case WEEKLY -> elapsed = ChronoUnit.WEEKS.between(start, due) / frequency * frequency;
            case MONTHLY -> elapsed = ChronoUnit.MONTHS.between(start.withDayOfMonth(1), due.withDayOfMonth(1));
            case YEARLY -> elapsed = ChronoUnit.YEARS.between(start.withDayOfYear(1), due.withDayOfYear(1));
            default -> { return 0; }
        }
        return elapsed / frequency + 1;
    }

    public static long meterCycleNumber(double reference, double interval, double dueValue) {
        if (!Double.isFinite(reference) || !Double.isFinite(interval) || interval <= 0
                || !Double.isFinite(dueValue) || dueValue < reference) return 0;
        return Math.max(0, Math.round((dueValue - reference) / interval));
    }

    /** OR fires on any newly due cycle; AND fires once every cycle is due. */
    public static Set<String> triggeredCycles(PreventiveMaintenancePlanConfiguration configuration,
                                               Collection<String> newlyDue,
                                               Collection<String> previouslyDue) {
        if (configuration == null || configuration.getMode() != PreventiveMaintenancePlanConfiguration.Mode.MULTI_COUNTER) {
            return Set.of();
        }
        Set<String> current = new LinkedHashSet<>(newlyDue == null ? List.of() : newlyDue);
        if (configuration.getCombination() == PreventiveMaintenancePlanConfiguration.Combination.OR) return current;
        Set<String> accumulated = new LinkedHashSet<>(previouslyDue == null ? List.of() : previouslyDue);
        accumulated.addAll(current);
        Set<String> configured = Optional.ofNullable(configuration.getCycles()).orElse(List.of()).stream()
                .map(PreventiveMaintenancePlanConfiguration.Cycle::getCode)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        return !configured.isEmpty() && accumulated.containsAll(configured) ? accumulated : Set.of();
    }

    public static List<Long> taskBaseIds(Collection<? extends HasTaskBaseIds> sources) {
        return sources.stream().flatMap(source -> source.taskBaseIds().stream())
                .filter(Objects::nonNull).distinct().toList();
    }

    public interface HasTaskBaseIds { List<Long> taskBaseIds(); }
}
