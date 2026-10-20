package com.grash.controller.analytics;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WOAnalyticsControllerTest {
    @Test
    void dueTodayIncludesUtcMidnightAndExcludesNextMidnight() {
        LocalDate day = LocalDate.of(2026, 10, 20);
        Date midnight = Date.from(day.atStartOfDay(ZoneOffset.UTC).toInstant());
        Date justBeforeNextDay = Date.from(
                day.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant().minusMillis(1));
        Date nextMidnight = Date.from(day.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant());

        assertTrue(WOAnalyticsController.isDueWithinUtcDay(midnight, day));
        assertTrue(WOAnalyticsController.isDueWithinUtcDay(justBeforeNextDay, day));
        assertFalse(WOAnalyticsController.isDueWithinUtcDay(nextMidnight, day));
        assertFalse(WOAnalyticsController.isDueWithinUtcDay(null, day));
    }

    @Test
    void dueTodayUsesUtcDayBoundariesIndependentOfServerTimezone() {
        LocalDate day = LocalDate.of(2026, 10, 20);
        Date beforeUtcStart = Date.from(Instant.parse("2026-10-19T23:59:59.999Z"));
        Date utcStart = Date.from(Instant.parse("2026-10-20T00:00:00Z"));

        assertFalse(WOAnalyticsController.isDueWithinUtcDay(beforeUtcStart, day));
        assertTrue(WOAnalyticsController.isDueWithinUtcDay(utcStart, day));
    }
}
