package com.grash.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class LicenseSeatRepository {
    private final JdbcTemplate jdbc;

    /** Shared by all QPM processes using this database; released at commit or rollback. */
    public void lockSeats() {
        jdbc.queryForObject("SELECT 1 FROM pg_advisory_xact_lock(1364217165)", Integer.class);
    }

    public long countFullUsers() {
        return countUsers(true);
    }

    public long countLightUsers() {
        return countUsers(false);
    }

    private long countUsers(boolean paid) {
        return jdbc.queryForObject("""
                SELECT COUNT(*) FROM own_user u JOIN role r ON u.role_id=r.id
                JOIN company c ON u.company_id=c.id
                WHERE u.enabled AND r.paid=? AND r.role_type!=0 AND c.demo=false
                """, Long.class, paid);
    }
}
