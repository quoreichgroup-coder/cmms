package group.quoreich.license.authority.console;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ConsoleDataServiceStateTest {
    private final Instant now = Instant.parse("2026-11-10T12:00:00Z");

    @Test
    void stateReflectsWhatTheSalesTeamMustDo() {
        assertEquals("REVOKED", ConsoleDataService.state("REVOKED", now, now.plus(Duration.ofDays(300)), now));
        assertEquals("SUSPENDED", ConsoleDataService.state("ACTIVE", now, now.plus(Duration.ofDays(300)), now));
        assertEquals("EXPIRED", ConsoleDataService.state("ACTIVE", null, now.minusSeconds(1), now));
        assertEquals("EXPIRING", ConsoleDataService.state("ACTIVE", null, now.plus(Duration.ofDays(59)), now));
        assertEquals("ACTIVE", ConsoleDataService.state("ACTIVE", null, now.plus(Duration.ofDays(61)), now));
        assertEquals("ACTIVE", ConsoleDataService.state("ACTIVE", null, null, now), "perpetual");
    }
}
