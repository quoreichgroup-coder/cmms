package group.quoreich.license.authority;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.time.Instant;
import java.util.Set;

public record LicenseIssueRequest(
        @NotBlank String customerName,
        @NotBlank String edition,
        @NotBlank @Pattern(regexp = "SUBSCRIPTION|PERPETUAL") String licenseType,
        @Min(0) int seatsFull,
        @Min(0) int seatsLight,
        @NotNull Set<@NotBlank String> entitlements,
        @NotNull Instant startsAt,
        Instant expiresAt,
        Instant maintenanceUntil
) {}
