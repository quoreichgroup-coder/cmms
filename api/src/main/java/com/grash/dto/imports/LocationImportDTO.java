package com.grash.dto.imports;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.Collection;
import java.util.UUID;

@Data
@NoArgsConstructor
@Builder
@AllArgsConstructor
@Schema(description = "DTO for importing locations from external data sources")
public class LocationImportDTO {

    @Schema(description = "Unique identifier")
    private Long id;

    @Schema(description = "Stable QPM UUID used to match this functional location across CSV transfers")
    private UUID exchangeId;

    @Schema(description = "Stable exchange UUID of the parent functional location")
    private UUID parentExchangeId;
    
    @Schema(description = "Name")
    private String name;

    @Schema(description = "Address")
    private String address;

    @Schema(description = "Longitude coordinate")
    private Double longitude;

    @Schema(description = "Latitude coordinate")
    private Double latitude;

    @Schema(description = "Parent location name")
    private String parentLocationName;
    
    @Schema(description = "List of worker emails")
    @Builder.Default
    private Collection<String> workersEmails = new ArrayList<>();
    
    @Schema(description = "List of team names")
    @Builder.Default
    private Collection<String> teamsNames = new ArrayList<>();
    
    @Schema(description = "List of customer names")
    @Builder.Default
    private Collection<String> customersNames = new ArrayList<>();
    
    @Schema(description = "List of vendor names")
    @Builder.Default
    private Collection<String> vendorsNames = new ArrayList<>();
}
