package com.grash.advancedsearch;

import org.junit.jupiter.api.Test;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class SearchDateValueConverterTest {
    @Test
    void convertsIsoInstantToDate() {
        String value = "2024-01-15T10:30:00.000Z";
        assertEquals(Date.from(Instant.parse(value)), SearchDateValueConverter.convert(value, Date.class));
    }

    @Test
    void convertsIsoInstantToTimestampWhenThatIsTheFieldType() {
        String value = "2024-01-15T10:30:00.000Z";
        assertEquals(Timestamp.from(Instant.parse(value)), SearchDateValueConverter.convert(value, Timestamp.class));
    }

    @Test
    void acceptsDateOnlyAsUtcStartOfDay() {
        assertEquals(Date.from(Instant.parse("2024-01-15T00:00:00Z")),
                SearchDateValueConverter.convert("2024-01-15", Date.class));
    }

    @Test
    void rejectsMalformedDateInsteadOfPassingItToHibernate() {
        assertThrows(IllegalArgumentException.class,
                () -> SearchDateValueConverter.convert("not-a-date", Date.class));
    }
}
