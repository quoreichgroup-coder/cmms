package com.grash.service;

import com.grash.dto.imports.*;
import com.grash.model.*;
import com.grash.model.enums.ImportEntity;
import com.grash.model.enums.Language;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StreamUtils;
import lombok.RequiredArgsConstructor;

import jakarta.transaction.Transactional;

import java.io.IOException;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ImportService {

    private final AssetService assetService;
    private final LocationService locationService;
    private final PartService partService;
    private final MeterService meterService;
    private final WorkOrderService workOrderService;
    private final PreventiveMaintenanceService preventiveMaintenanceService;

    @Transactional
    public ImportResponse importWorkOrders(List<WorkOrderImportDTO> toImport, Company company) {
        List<Long> idsToCheck = toImport.stream()
                .map(WorkOrderImportDTO::getId)
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toList());

        Map<Long, WorkOrder> existingWorkOrders = new java.util.HashMap<>();
        if (!idsToCheck.isEmpty()) {
            workOrderService.findByIdsAndCompany(idsToCheck, company.getId())
                    .forEach(wo -> existingWorkOrders.put(wo.getId(), wo));
        }

        List<WorkOrder> workOrdersToSave = new java.util.ArrayList<>();
        int created = 0;
        int updated = 0;

        for (WorkOrderImportDTO dto : toImport) {
            Long id = dto.getId();
            WorkOrder workOrder;

            if (id == null) {
                workOrder = new WorkOrder();
                created++;
            } else if (existingWorkOrders.containsKey(id)) {
                workOrder = existingWorkOrders.get(id);
                updated++;
            } else {
                workOrder = new WorkOrder();
                created++;
            }

            workOrderService.importWorkOrder(workOrder, dto, company);
            workOrdersToSave.add(workOrder);
        }

        if (!workOrdersToSave.isEmpty()) {
            workOrderService.saveAll(workOrdersToSave);
        }

        return ImportResponse.builder()
                .created(created)
                .updated(updated)
                .build();
    }

    @Transactional
    public ImportResponse importAssets(List<AssetImportDTO> toImport, Company company) {
        Set<UUID> assetExchangeKeys = new HashSet<>();
        toImport.forEach(dto -> {
            if (dto.getExchangeId() != null) assetExchangeKeys.add(dto.getExchangeId());
            if (dto.getParentExchangeId() != null) assetExchangeKeys.add(dto.getParentExchangeId());
        });
        Map<UUID, Asset> companyAssetsByExchangeId = new HashMap<>();
        assetService.findByExchangeIdsAndCompany(assetExchangeKeys, company.getId())
                .forEach(asset -> companyAssetsByExchangeId.put(asset.getExchangeId(), asset));
        Set<UUID> installationLocationKeys = new HashSet<>();
        toImport.stream().map(AssetImportDTO::getLocationExchangeId).filter(Objects::nonNull)
                .forEach(installationLocationKeys::add);
        Map<UUID, Location> companyLocationsByExchangeId = new HashMap<>();
        locationService.findByExchangeIdsAndCompany(installationLocationKeys, company.getId())
                .forEach(location -> companyLocationsByExchangeId.put(location.getExchangeId(), location));
        if (companyLocationsByExchangeId.size() != installationLocationKeys.size()) {
            throw new IllegalArgumentException("An installation functional location exchange key was not found in this company");
        }
        Map<String, Asset> resolvedExternalParents = HierarchyImportValidator.validate(
                toImport,
                AssetImportDTO::getName,
                dto -> dto.getParentExchangeId() == null ? dto.getParentAssetName() : null,
                AssetImportDTO::getId,
                parentName -> assetService.findByNameIgnoreCaseAndCompany(parentName, company.getId()),
                Asset::getId,
                "asset");
        Map<String, Asset> resolvedExternalParentsByExchangeId = HierarchyImportValidator.validateExchangeReferences(
                toImport, AssetImportDTO::getExchangeId, AssetImportDTO::getParentExchangeId,
                companyAssetsByExchangeId::get,
                "asset");

        // Check for duplicate non-null barcodes
        Set<String> seenBarcodes = new java.util.HashSet<>();
        for (AssetImportDTO dto : toImport) {
            if (dto.getBarCode() != null && !dto.getBarCode().isEmpty()) {
                if (!seenBarcodes.add(dto.getBarCode())) {
                    throw new IllegalArgumentException("Duplicate barcode found: " + dto.getBarCode());
                }
            }
        }

        List<Long> idsToCheck = toImport.stream()
                .map(AssetImportDTO::getId)
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toList());

        Map<Long, Asset> existingAssets = new java.util.HashMap<>();
        if (!idsToCheck.isEmpty()) {
            assetService.findByIdsAndCompany(idsToCheck, company.getId())
                    .forEach(asset -> existingAssets.put(asset.getId(), asset));
        }
        Map<String, Asset> assetsByName = new java.util.HashMap<>();
        assetsByName.putAll(resolvedExternalParents);
        Map<String, Asset> assetsByExchangeId = new HashMap<>(resolvedExternalParentsByExchangeId);
        List<Asset> assetsToSave = new java.util.ArrayList<>();
        int created = 0;
        int updated = 0;

        List<AssetImportDTO> orderedAssets = AssetService.orderAssets(toImport);
        if (orderedAssets.size() != toImport.size()) {
            throw new IllegalArgumentException("Asset hierarchy import contains unresolved parent cycles");
        }

        for (AssetImportDTO dto : orderedAssets) {
            Long id = dto.getId();
            Asset asset;
            boolean updatingExisting = false;

            if (dto.getExchangeId() != null && companyAssetsByExchangeId.containsKey(dto.getExchangeId())) {
                asset = companyAssetsByExchangeId.get(dto.getExchangeId());
                updatingExisting = true;
                updated++;
            } else if (dto.getExchangeId() != null) {
                asset = new Asset();
                asset.setExchangeId(dto.getExchangeId());
                created++;
            } else if (id == null) {
                asset = new Asset();
                created++;
            } else if (existingAssets.containsKey(id)) {
                asset = existingAssets.get(id);
                updatingExisting = true;
                updated++;
            } else {
                asset = new Asset();
                created++;
            }

            String existingCustomId = asset.getCustomId();
            assetService.setAssetFieldsFromImportDto(asset, dto, company, assetsByName,
                    assetsByExchangeId, companyLocationsByExchangeId);
            if (updatingExisting) asset.setCustomId(existingCustomId);
            assetsToSave.add(asset);
            assetsByName.put(asset.getName(), asset);
            assetsByExchangeId.put(asset.getExchangeId().toString(), asset);
        }

        if (!assetsToSave.isEmpty()) {
            assetService.saveAll(assetsToSave);
        }

        return ImportResponse.builder()
                .created(created)
                .updated(updated)
                .build();
    }

    @Transactional
    public ImportResponse importLocations(List<LocationImportDTO> toImport, Company company) {
        Set<UUID> locationExchangeKeys = new HashSet<>();
        toImport.forEach(dto -> {
            if (dto.getExchangeId() != null) locationExchangeKeys.add(dto.getExchangeId());
            if (dto.getParentExchangeId() != null) locationExchangeKeys.add(dto.getParentExchangeId());
        });
        Map<UUID, Location> companyLocationsByExchangeId = new HashMap<>();
        locationService.findByExchangeIdsAndCompany(locationExchangeKeys, company.getId())
                .forEach(location -> companyLocationsByExchangeId.put(location.getExchangeId(), location));
        Map<String, Location> resolvedExternalParents = HierarchyImportValidator.validate(
                toImport,
                LocationImportDTO::getName,
                dto -> dto.getParentExchangeId() == null ? dto.getParentLocationName() : null,
                LocationImportDTO::getId,
                parentName -> locationService.findByNameIgnoreCaseAndCompany(parentName, company.getId()),
                Location::getId,
                "functional location");
        Map<String, Location> resolvedExternalParentsByExchangeId = HierarchyImportValidator.validateExchangeReferences(
                toImport, LocationImportDTO::getExchangeId, LocationImportDTO::getParentExchangeId,
                companyLocationsByExchangeId::get,
                "functional location");

        List<Long> idsToCheck = toImport.stream()
                .map(LocationImportDTO::getId)
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toList());

        Map<Long, Location> existingLocations = new java.util.HashMap<>();
        if (!idsToCheck.isEmpty()) {
            locationService.findByIdsAndCompany(idsToCheck, company.getId())
                    .forEach(location -> existingLocations.put(location.getId(), location));
        }
        Map<String, Location> locationsByName = new java.util.HashMap<>();
        locationsByName.putAll(resolvedExternalParents);
        Map<String, Location> locationsByExchangeId = new HashMap<>(resolvedExternalParentsByExchangeId);
        List<Location> locationsToSave = new java.util.ArrayList<>();
        int created = 0;
        int updated = 0;

        List<LocationImportDTO> orderedLocations = LocationService.orderLocations(toImport);
        if (orderedLocations.size() != toImport.size()) {
            throw new IllegalArgumentException("Functional location hierarchy import contains unresolved parent cycles");
        }

        for (LocationImportDTO dto : orderedLocations) {
            Long id = dto.getId();
            Location location;
            boolean updatingExisting = false;

            if (dto.getExchangeId() != null && companyLocationsByExchangeId.containsKey(dto.getExchangeId())) {
                location = companyLocationsByExchangeId.get(dto.getExchangeId());
                updatingExisting = true;
                updated++;
            } else if (dto.getExchangeId() != null) {
                location = new Location();
                location.setExchangeId(dto.getExchangeId());
                created++;
            } else if (id == null) {
                location = new Location();
                created++;
            } else if (existingLocations.containsKey(id)) {
                location = existingLocations.get(id);
                updatingExisting = true;
                updated++;
            } else {
                location = new Location();
                created++;
            }

            String existingCustomId = location.getCustomId();
            locationService.setLocationFieldsFromImportDto(location, dto, company, locationsByName, locationsByExchangeId);
            if (updatingExisting) location.setCustomId(existingCustomId);
            locationsToSave.add(location);
            locationsByName.put(location.getName(), location);
            locationsByExchangeId.put(location.getExchangeId().toString(), location);
        }

        if (!locationsToSave.isEmpty()) {
            locationService.saveAll(locationsToSave);
        }

        return ImportResponse.builder()
                .created(created)
                .updated(updated)
                .build();
    }

    @Transactional
    public ImportResponse importMeters(List<MeterImportDTO> toImport, Company company) {
        List<Long> idsToCheck = toImport.stream()
                .map(MeterImportDTO::getId)
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toList());

        Map<Long, Meter> existingMeters = new java.util.HashMap<>();
        if (!idsToCheck.isEmpty()) {
            meterService.findByIdsAndCompany(idsToCheck, company.getId())
                    .forEach(meter -> existingMeters.put(meter.getId(), meter));
        }

        List<Meter> metersToSave = new java.util.ArrayList<>();
        int created = 0;
        int updated = 0;

        for (MeterImportDTO dto : toImport) {
            Long id = dto.getId();
            Meter meter;

            if (id == null) {
                meter = new Meter();
                created++;
            } else if (existingMeters.containsKey(id)) {
                meter = existingMeters.get(id);
                updated++;
            } else {
                meter = new Meter();
                created++;
            }

            meterService.importMeter(meter, dto, company);
            metersToSave.add(meter);
        }

        if (!metersToSave.isEmpty()) {
            meterService.saveAll(metersToSave);
        }

        return ImportResponse.builder()
                .created(created)
                .updated(updated)
                .build();
    }

    @Transactional
    public ImportResponse importParts(List<PartImportDTO> toImport, Company company) {
        // Check for duplicate non-null barcodes
        Set<String> seenBarcodes = new java.util.HashSet<>();
        for (PartImportDTO dto : toImport) {
            if (dto.getBarcode() != null && !dto.getBarcode().isEmpty()) {
                if (!seenBarcodes.add(dto.getBarcode())) {
                    throw new IllegalArgumentException("Duplicate barcode found: " + dto.getBarcode());
                }
            }
        }

        List<Long> idsToCheck = toImport.stream()
                .map(PartImportDTO::getId)
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toList());

        Map<Long, Part> existingParts = new java.util.HashMap<>();
        if (!idsToCheck.isEmpty()) {
            partService.findByIdsAndCompany(idsToCheck, company.getId())
                    .forEach(part -> existingParts.put(part.getId(), part));
        }

        List<Part> partsToSave = new java.util.ArrayList<>();
        int created = 0;
        int updated = 0;

        for (PartImportDTO dto : toImport) {
            Long id = dto.getId();
            Part part;

            if (id == null) {
                part = new Part();
                created++;
            } else if (existingParts.containsKey(id)) {
                part = existingParts.get(id);
                updated++;
            } else {
                part = new Part();
                created++;
            }

            partService.importPart(part, dto, company);
            partsToSave.add(part);
        }

        if (!partsToSave.isEmpty()) {
            partService.saveAll(partsToSave);
        }

        return ImportResponse.builder()
                .created(created)
                .updated(updated)
                .build();
    }

    public ImportResponse importPreventiveMaintenances(List<PreventiveMaintenanceImportDTO> toImport, Company company) {
        final int[] created = {0};
        final int[] updated = {0};
        toImport.forEach(pmImportDTO -> {
            Long id = pmImportDTO.getId();
            PreventiveMaintenance preventiveMaintenance = new PreventiveMaintenance();
            if (id == null) {
                created[0]++;
            } else {
                Optional<PreventiveMaintenance> optionalPM = preventiveMaintenanceService.findByIdAndCompany(id,
                        company.getId());
                if (optionalPM.isPresent()) {
                    preventiveMaintenance = optionalPM.get();
                    updated[0]++;
                } else {
                    created[0]++;
                }
            }
            preventiveMaintenanceService.importPreventiveMaintenance(preventiveMaintenance, pmImportDTO, company);
        });
        return ImportResponse.builder()
                .created(created[0])
                .updated(updated[0])
                .build();
    }

    public byte[] getTemplate(Language language, ImportEntity importEntity) throws IOException {
        String path =
                "import-templates/" + language.name().toLowerCase() + "/" + importEntity.name().toLowerCase() + ".csv";
        String fallbackPath = "import-templates/en/" + importEntity.name().toLowerCase() + ".csv";

        return readFileWithFallback(path, fallbackPath);
    }

    private byte[] readFileWithFallback(String path, String fallbackPath) throws IOException {
        ClassPathResource resource = new ClassPathResource(path);

        if (!resource.exists()) {
            resource = new ClassPathResource(fallbackPath);
        }

        return StreamUtils.copyToByteArray(resource.getInputStream());
    }

}

