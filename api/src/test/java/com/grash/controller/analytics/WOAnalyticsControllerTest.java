package com.grash.controller.analytics;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WOAnalyticsControllerTest {
    @Test
    void dueTodayIncludesLocalMidnightAndExcludesNextMidnight() {
        LocalDate day = LocalDate.of(2026, 10, 20);
        ZoneId timeZone = ZoneId.of("Europe/Berlin");
        Date midnight = Date.from(day.atStartOfDay(timeZone).toInstant());
        Date justBeforeNextDay = Date.from(
                day.plusDays(1).atStartOfDay(timeZone).toInstant().minusMillis(1));
        Date nextMidnight = Date.from(day.plusDays(1).atStartOfDay(timeZone).toInstant());

        assertTrue(WOAnalyticsController.isDueWithinDay(midnight, day, timeZone));
        assertTrue(WOAnalyticsController.isDueWithinDay(justBeforeNextDay, day, timeZone));
        assertFalse(WOAnalyticsController.isDueWithinDay(nextMidnight, day, timeZone));
        assertFalse(WOAnalyticsController.isDueWithinDay(null, day, timeZone));
    }

    @Test
    void dueTodayUsesCompanyTimeZoneAndRespectsDaylightSavingBoundary() {
        ZoneId timeZone = ZoneId.of("Europe/Berlin");
        LocalDate day = LocalDate.of(2026, 3, 29);
        Date beforeLocalStart = Date.from(Instant.parse("2026-03-28T22:59:59.999Z"));
        Date localStart = Date.from(Instant.parse("2026-03-28T23:00:00Z"));
        Date beforeNextDay = Date.from(Instant.parse("2026-03-29T21:59:59.999Z"));
        Date nextLocalDay = Date.from(Instant.parse("2026-03-29T22:00:00Z"));

        assertFalse(WOAnalyticsController.isDueWithinDay(beforeLocalStart, day, timeZone));
        assertTrue(WOAnalyticsController.isDueWithinDay(localStart, day, timeZone));
        assertTrue(WOAnalyticsController.isDueWithinDay(beforeNextDay, day, timeZone));
        assertFalse(WOAnalyticsController.isDueWithinDay(nextLocalDay, day, timeZone));
    }

    @Test
    void invalidCompanyTimeZoneFallsBackToUtc() {
        assertEquals(ZoneOffset.UTC, WOAnalyticsController.resolveTimeZone("Not/A-Time-Zone"));
        assertEquals(ZoneOffset.UTC, WOAnalyticsController.resolveTimeZone(null));
        assertEquals(ZoneOffset.UTC, WOAnalyticsController.resolveTimeZone(" "));
    }
}
