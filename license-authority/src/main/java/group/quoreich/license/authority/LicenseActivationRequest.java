package group.quoreich.license.authority;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record LicenseActivationRequest(
        @NotBlank String licenseKey,
        @NotBlank @Pattern(regexp = "[a-fA-F0-9]{64}") String fingerprint,
        @NotBlank @Pattern(regexp = "PRODUCTION|PREPRODUCTION") String environment
) {}
