package com.grash.service;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class CustomHealthIndicator implements HealthIndicator {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public Health health() {
        try {
            Integer result = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            if (Integer.valueOf(1).equals(result)) {
                return Health.up().withDetail("database", "available").build();
            }
            return Health.down().withDetail("database", "unavailable").build();
        } catch (RuntimeException exception) {
            // Keep implementation details out of the public health response.
            return Health.down().withDetail("database", "unavailable").build();
        }
    }
}
