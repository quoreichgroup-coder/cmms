package com.grash.advancedsearch;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.Date;

/** Converts JSON date strings to the Java temporal type expected by a search path. */
final class SearchDateValueConverter {
    private SearchDateValueConverter() {
    }

    static Date convert(String value, Class<?> targetType) {
        try {
            Instant instant;
            try {
                instant = Instant.parse(value);
            } catch (DateTimeParseException instantParseError) {
                try {
                    instant = OffsetDateTime.parse(value).toInstant();
                } catch (DateTimeParseException offsetParseError) {
                    instant = LocalDate.parse(value).atStartOfDay(ZoneOffset.UTC).toInstant();
                }
            }
            if (Timestamp.class.isAssignableFrom(targetType)) {
                return Timestamp.from(instant);
            }
            return Date.from(instant);
        } catch (DateTimeParseException exception) {
            throw new IllegalArgumentException("Invalid date filter value", exception);
        }
    }
}
