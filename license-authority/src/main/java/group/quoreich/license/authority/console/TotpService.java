package group.quoreich.license.authority.console;

import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.OptionalLong;

/**
 * Time-based one-time passwords (RFC 6238, HMAC-SHA1, 6 digits, 30 s), compatible with Google Authenticator,
 * Microsoft Authenticator, FreeOTP and similar apps. A code is accepted one step before or after the current
 * one to absorb clock drift; the caller stores the accepted step so a code cannot be replayed.
 */
@Component
public class TotpService {
    static final int STEP_SECONDS = 30;
    private static final int DIGITS = 6;
    private static final String BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static final SecureRandom RANDOM = new SecureRandom();

    /** 160-bit secret, Base32 encoded (what authenticator apps expect). */
    public String newSecret() {
        byte[] bytes = new byte[20];
        RANDOM.nextBytes(bytes);
        return base32(bytes);
    }

    public String provisioningUri(String issuer, String account, String secret) {
        String label = URLEncoder.encode(issuer + ":" + account, StandardCharsets.UTF_8).replace("+", "%20");
        return "otpauth://totp/" + label + "?secret=" + secret + "&issuer="
                + URLEncoder.encode(issuer, StandardCharsets.UTF_8).replace("+", "%20")
                + "&algorithm=SHA1&digits=6&period=30";
    }

    /** The accepted time step, or empty when the code is wrong or already used (step not after lastUsedStep). */
    public OptionalLong verify(String secret, String code, Instant now, Long lastUsedStep) {
        if (secret == null || code == null || !code.matches("\\d{6}")) return OptionalLong.empty();
        long current = now.getEpochSecond() / STEP_SECONDS;
        byte[] key = decodeBase32(secret);
        for (long step = current - 1; step <= current + 1; step++) {
            if (lastUsedStep != null && step <= lastUsedStep) continue;
            if (constantTimeEquals(code, generate(key, step))) return OptionalLong.of(step);
        }
        return OptionalLong.empty();
    }

    String generate(byte[] key, long step) {
        try {
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(key, "HmacSHA1"));
            byte[] hash = mac.doFinal(ByteBuffer.allocate(8).putLong(step).array());
            int offset = hash[hash.length - 1] & 0x0f;
            int binary = ((hash[offset] & 0x7f) << 24) | ((hash[offset + 1] & 0xff) << 16)
                    | ((hash[offset + 2] & 0xff) << 8) | (hash[offset + 3] & 0xff);
            return String.format("%0" + DIGITS + "d", binary % 1_000_000);
        } catch (Exception e) {
            throw new IllegalStateException("TOTP computation failed", e);
        }
    }

    private static boolean constantTimeEquals(String a, String b) {
        return java.security.MessageDigest.isEqual(a.getBytes(StandardCharsets.US_ASCII), b.getBytes(StandardCharsets.US_ASCII));
    }

    static String base32(byte[] data) {
        StringBuilder out = new StringBuilder();
        int buffer = 0, bits = 0;
        for (byte value : data) {
            buffer = (buffer << 8) | (value & 0xff);
            bits += 8;
            while (bits >= 5) {
                out.append(BASE32.charAt((buffer >> (bits - 5)) & 31));
                bits -= 5;
            }
        }
        if (bits > 0) out.append(BASE32.charAt((buffer << (5 - bits)) & 31));
        return out.toString();
    }

    static byte[] decodeBase32(String value) {
        String clean = value.replace("=", "").replace(" ", "").toUpperCase();
        ByteBuffer out = ByteBuffer.allocate(clean.length() * 5 / 8);
        int buffer = 0, bits = 0;
        for (char character : clean.toCharArray()) {
            int index = BASE32.indexOf(character);
            if (index < 0) throw new IllegalArgumentException("Invalid Base32 secret");
            buffer = (buffer << 5) | index;
            bits += 5;
            if (bits >= 8) {
                out.put((byte) ((buffer >> (bits - 8)) & 0xff));
                bits -= 8;
            }
        }
        byte[] result = new byte[out.position()];
        out.flip();
        out.get(result);
        return result;
    }
}
