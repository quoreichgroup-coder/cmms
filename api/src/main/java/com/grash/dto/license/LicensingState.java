package com.grash.dto.license;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Data
@Builder
@Schema(description = "Current licensing state for an organization, including plan, entitlements, and validity")
public class LicensingState {
    @Schema(description = "Whether the organization has an active license")
    private boolean hasLicense;
    @Schema(description = "Whether the current license is valid")
    private boolean valid;
    @Schema(description = "Whether license entitlements are simulated for local development")
    private boolean previewMode;
    @Builder.Default
    @Schema(description = "Whether the instance must remain read-only until the license is renewed")
    private boolean readOnly = false;
    @Schema(description = "Name of the current subscription plan")
    private String planName;
    @Schema(description = "Set of entitlement codes granted by the current license")
    @Builder.Default
    private Set<String> entitlements = new HashSet<>();
    @Schema(description = "Expiration date of the current license")
    private Date expirationDate;
    @Schema(description = "Number of licensed users")
    private int usersCount;
    @Schema(description = "Stable identifier of the activated license")
    private String licenseId;
    @Schema(description = "License commercial model, for example SUBSCRIPTION or PERPETUAL")
    private String licenseType;
    @Schema(description = "Customer name recorded on the license")
    private String customerName;
    @Schema(description = "Activated environment, for example PRODUCTION or PREPRODUCTION")
    private String environment;
    @Schema(description = "Maximum named full-user seats")
    private int seatsFull;
    @Schema(description = "Maximum named light-user seats")
    private int seatsLight;
    @Schema(description = "Expiration of the signed offline activation lease")
    private Date leaseExpirationDate;
}
