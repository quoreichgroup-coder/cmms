package group.quoreich.license.authority;

import java.time.Instant;

public record LicenseRenewRequest(Instant expiresAt, Instant maintenanceUntil) { }
