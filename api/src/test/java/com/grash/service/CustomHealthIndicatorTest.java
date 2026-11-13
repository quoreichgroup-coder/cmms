package com.grash.service;

import org.junit.jupiter.api.Test;
import org.springframework.boot.actuate.health.Status;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CustomHealthIndicatorTest {

    @Test
    void reportsUpWhenDatabaseQuerySucceeds() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        when(jdbcTemplate.queryForObject("SELECT 1", Integer.class)).thenReturn(1);

        assertEquals(Status.UP, new CustomHealthIndicator(jdbcTemplate).health().getStatus());
    }

    @Test
    void reportsDownWhenDatabaseQueryFailsWithoutExposingException() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        when(jdbcTemplate.queryForObject("SELECT 1", Integer.class))
                .thenThrow(new IllegalStateException("database credentials must not leak"));

        var health = new CustomHealthIndicator(jdbcTemplate).health();

        assertEquals(Status.DOWN, health.getStatus());
        assertEquals("unavailable", health.getDetails().get("database"));
        org.junit.jupiter.api.Assertions.assertFalse(health.getDetails().containsKey("exception"));
    }
}
