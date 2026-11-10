package group.quoreich.license.authority.console;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class TotpServiceTest {
    private final TotpService totp = new TotpService();
    // RFC 6238 appendix B, SHA-1 seed "12345678901234567890"; 6-digit codes are the last six digits.
    private final String secret = TotpService.base32("12345678901234567890".getBytes(StandardCharsets.US_ASCII));

    @Test
    void matchesTheRfc6238TestVectors() {
        byte[] key = TotpService.decodeBase32(secret);
        assertEquals("287082", totp.generate(key, 59L / 30));
        assertEquals("081804", totp.generate(key, 1111111109L / 30));
        assertEquals("050471", totp.generate(key, 1111111111L / 30));
        assertEquals("005924", totp.generate(key, 1234567890L / 30));
        assertEquals("279037", totp.generate(key, 2000000000L / 30));
        assertEquals("353130", totp.generate(key, 20000000000L / 30));
    }

    @Test
    void acceptsOneStepOfClockDriftAndRefusesReplay() {
        Instant now = Instant.ofEpochSecond(1234567890L);
        long step = 1234567890L / 30;
        String previous = totp.generate(TotpService.decodeBase32(secret), step - 1);

        assertEquals(step - 1, totp.verify(secret, previous, now, null).orElseThrow());
        assertTrue(totp.verify(secret, previous, now, step - 1).isEmpty(), "a code cannot be used twice");
        assertTrue(totp.verify(secret, "000000", now, null).isEmpty());
        assertTrue(totp.verify(secret, "12345", now, null).isEmpty());
    }

    @Test
    void secretsRoundTripAndProvisioningUriIsStandard() {
        String generated = totp.newSecret();
        assertEquals(32, generated.length());
        assertEquals(20, TotpService.decodeBase32(generated).length);
        String uri = totp.provisioningUri("QUOREICH Licences", "a@b.bf", generated);
        assertTrue(uri.startsWith("otpauth://totp/QUOREICH%20Licences%3Aa%40b.bf?secret=" + generated));
        assertTrue(uri.contains("&period=30"));
    }
}
