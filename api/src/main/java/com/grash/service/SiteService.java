package com.grash.service;

import com.grash.dto.SiteDTO;
import com.grash.exception.CustomException;
import com.grash.model.Location;
import com.grash.model.Site;
import com.grash.model.User;
import com.grash.repository.LocationRepository;
import com.grash.repository.SiteRepository;
import com.grash.repository.AssetRepository;
import com.grash.repository.WorkOrderRepository;
import com.grash.repository.PreventiveMaintenanceRepository;
import com.grash.repository.PartQuantityRepository;
import com.grash.repository.PurchaseRequisitionLineRepository;
import com.grash.repository.GeneratedDocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.time.DateTimeException;
import java.time.ZoneId;

@Service
@RequiredArgsConstructor
public class SiteService {
    private final SiteRepository siteRepository;
    private final LocationRepository locationRepository;
    private final AssetRepository assetRepository;
    private final WorkOrderRepository workOrderRepository;
    private final PreventiveMaintenanceRepository preventiveMaintenanceRepository;
    private final GeneratedDocumentRepository generatedDocumentRepository;
    private final PartQuantityRepository partQuantityRepository;
    private final PurchaseRequisitionLineRepository requisitionLineRepository;
    private final CompanyConfigurationAuditService configurationAuditService;
    private final FileService fileService;
    private final com.grash.mapper.FileMapper fileMapper;
    private final com.grash.factory.StorageServiceFactory storageServiceFactory;
    private final LicenseService licenseService;

    @Transactional(readOnly = true)
    public List<SiteDTO> list(User user) {
        return siteRepository.findByCompany_IdOrderByNameAsc(user.getCompany().getId()).stream()
                .filter(site -> user.canAccessSite(site))
                .map(this::toDto).toList();
    }

    @Transactional
    public SiteDTO create(SiteDTO input, User user) {
        // The first site is always allowed; additional ones are the MULTI_SITE module.
        if (!siteRepository.findByCompany_IdOrderByNameAsc(user.getCompany().getId()).isEmpty())
            licenseService.requireEntitlement(com.grash.dto.license.LicenseEntitlement.MULTI_SITE);
        String code = input.getCode().trim().toUpperCase(java.util.Locale.ROOT);
        if (siteRepository.existsByCompany_IdAndCodeIgnoreCase(user.getCompany().getId(), code))
            throw new CustomException("Site code already exists", HttpStatus.CONFLICT);
        Site site = new Site();
        site.setCompany(user.getCompany());
        apply(site, input, user);
        Site saved = siteRepository.save(site);
        configurationAuditService.record(user.getCompany(), user, "SITE", saved.getId(), "CREATED",
                List.of("name", "code", "rootLocation", "timeZone", "documentLanguage"));
        return toDto(saved);
    }

    @Transactional
    public SiteDTO update(Long id, SiteDTO input, User user) {
        Site site = siteRepository.findById(id)
                .filter(value -> value.getCompany().getId().equals(user.getCompany().getId()))
                .orElseThrow(() -> new CustomException("Site not found", HttpStatus.NOT_FOUND));
        List<String> changed = new java.util.ArrayList<>();
        if (!site.getName().equals(input.getName().trim())) changed.add("name");
        if (!site.getCode().equalsIgnoreCase(input.getCode().trim())) changed.add("code");
        Long oldRootId = site.getRootLocation() == null ? null : site.getRootLocation().getId();
        if (!java.util.Objects.equals(oldRootId, input.getRootLocationId())) changed.add("rootLocation");
        if (!java.util.Objects.equals(site.getTimeZone(), blankToNull(input.getTimeZone()))) changed.add("timeZone");
        if (site.getDocumentLanguage() != input.getDocumentLanguage()) changed.add("documentLanguage");
        String code = input.getCode().trim().toUpperCase(java.util.Locale.ROOT);
        if (siteRepository.existsByCompany_IdAndCodeIgnoreCaseAndIdNot(user.getCompany().getId(), code, id))
            throw new CustomException("Site code already exists", HttpStatus.CONFLICT);
        apply(site, input, user);
        Site saved = siteRepository.save(site);
        configurationAuditService.record(user.getCompany(), user, "SITE", saved.getId(), "UPDATED", changed);
        return toDto(saved);
    }

    @Transactional
    public void delete(Long id, User user) {
        Site site = siteRepository.findById(id)
                .filter(value -> value.getCompany().getId().equals(user.getCompany().getId()))
                .orElseThrow(() -> new CustomException("Site not found", HttpStatus.NOT_FOUND));
        if (assetRepository.existsBySite_Id(id) || workOrderRepository.existsBySite_Id(id)
                || preventiveMaintenanceRepository.existsBySite_Id(id) || generatedDocumentRepository.existsBySite_Id(id)
                || partQuantityRepository.existsBySite_Id(id) || requisitionLineRepository.existsBySite_Id(id))
            throw new CustomException("Site is in use and cannot be deleted", HttpStatus.CONFLICT);
        configurationAuditService.record(user.getCompany(), user, "SITE", id, "DELETED",
                List.of("name", "code", "rootLocation", "timeZone", "documentLanguage"));
        siteRepository.delete(site);
    }

    @Transactional
    public SiteDTO setLogo(Long id, Long fileId, User user) {
        Site site = companySite(id, user);
        com.grash.model.File file = fileService.findById(fileId)
                .filter(value -> value.getCompany() != null
                        && value.getCompany().getId().equals(user.getCompany().getId()))
                .orElseThrow(() -> new CustomException("File not found", HttpStatus.NOT_FOUND));
        // Checked now rather than silently dropped when a document is printed.
        byte[] bytes;
        try {
            bytes = storageServiceFactory.getStorageService().download(file);
        } catch (RuntimeException exception) {
            throw new CustomException("site_logo_unreadable", HttpStatus.BAD_REQUEST);
        }
        if (bytes == null || bytes.length == 0 || bytes.length > DocumentLogoService.MAX_LOGO_BYTES)
            throw new CustomException("site_logo_too_large", HttpStatus.BAD_REQUEST);
        if (DocumentLogoService.imageMimeType(bytes) == null)
            throw new CustomException("site_logo_invalid_format", HttpStatus.BAD_REQUEST);
        site.setLogo(file);
        Site saved = siteRepository.save(site);
        configurationAuditService.record(user.getCompany(), user, "SITE", saved.getId(), "UPDATED", List.of("logo"));
        return toDto(saved);
    }

    @Transactional
    public SiteDTO removeLogo(Long id, User user) {
        Site site = companySite(id, user);
        if (site.getLogo() == null) return toDto(site);
        site.setLogo(null);
        Site saved = siteRepository.save(site);
        configurationAuditService.record(user.getCompany(), user, "SITE", saved.getId(), "UPDATED", List.of("logo"));
        return toDto(saved);
    }

    private Site companySite(Long id, User user) {
        return siteRepository.findById(id)
                .filter(value -> value.getCompany().getId().equals(user.getCompany().getId()))
                .orElseThrow(() -> new CustomException("Site not found", HttpStatus.NOT_FOUND));
    }

    private void apply(Site site, SiteDTO input, User user) {
        site.setName(input.getName().trim());
        site.setCode(input.getCode().trim().toUpperCase(java.util.Locale.ROOT));
        String timeZone = blankToNull(input.getTimeZone());
        if (timeZone != null) {
            try {
                ZoneId.of(timeZone);
            } catch (DateTimeException exception) {
                throw new CustomException("Invalid time zone", HttpStatus.BAD_REQUEST);
            }
        }
        site.setTimeZone(timeZone);
        site.setDocumentLanguage(input.getDocumentLanguage());
        if (input.getRootLocationId() == null) {
            site.setRootLocation(null);
        } else {
            Location location = locationRepository.findById(input.getRootLocationId())
                    .filter(value -> value.getCompany().getId().equals(user.getCompany().getId()))
                    .orElseThrow(() -> new CustomException("Root location not found", HttpStatus.BAD_REQUEST));
            if (location.getParentLocation() != null)
                throw new CustomException("Site root location must be a root location", HttpStatus.BAD_REQUEST);
            site.setRootLocation(location);
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private SiteDTO toDto(Site site) {
        SiteDTO dto = new SiteDTO();
        dto.setId(site.getId()); dto.setName(site.getName()); dto.setCode(site.getCode());
        dto.setRootLocationId(site.getRootLocation() == null ? null : site.getRootLocation().getId());
        dto.setTimeZone(site.getTimeZone()); dto.setDocumentLanguage(site.getDocumentLanguage());
        if (site.getLogo() != null) {
            dto.setLogoId(site.getLogo().getId());
            dto.setLogoUrl(fileMapper.toShowDto(site.getLogo()).getUrl());
        }
        return dto;
    }
}
