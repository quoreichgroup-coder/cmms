package com.grash.controller;

import com.grash.dto.CompanyPatchDTO;
import com.grash.dto.CompanyShowDTO;
import com.grash.dto.CompanyLegalProfileDTO;
import com.grash.dto.CompanyConfigurationAuditDTO;
import com.grash.exception.CustomException;
import com.grash.mapper.CompanyMapper;
import com.grash.model.Company;
import com.grash.model.User;
import com.grash.model.enums.PermissionEntity;
import com.grash.service.CacheService;
import com.grash.service.CompanyService;
import com.grash.service.UserService;
import com.grash.repository.CompanyLegalProfileRepository;
import com.grash.model.CompanyLegalProfile;
import com.grash.service.CompanyConfigurationAuditService;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/companies")
@Tag(name = "Companies", description = "Operations on companies")
@RequiredArgsConstructor
public class CompanyController {

    private final CompanyService companyService;

    private final UserService userService;
    private final CompanyMapper companyMapper;
    private final CacheService cacheService;
    private final CompanyLegalProfileRepository legalProfileRepository;
    private final CompanyConfigurationAuditService configurationAuditService;

    @GetMapping("/{id}")
    @PreAuthorize("permitAll()")
    public CompanyShowDTO getById(@PathVariable("id") Long id, HttpServletRequest req) {
        User user = userService.whoami(req);

        Optional<Company> companyOptional = companyService.findById(id);
        if (companyOptional.isPresent()) {
            Company savedCompany = companyOptional.get();
            if (!savedCompany.getId().equals(user.getCompany().getId()))
                throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
            return companyMapper.toShowDto(savedCompany);
        } else throw new CustomException("Not found", HttpStatus.NOT_FOUND);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public CompanyShowDTO patch(@Parameter(description = "Company fields to update") @Valid @RequestBody CompanyPatchDTO company,
                                @PathVariable("id") Long id,
                                HttpServletRequest req) {
        User user = userService.whoami(req);
        Optional<Company> optionalCompany = companyService.findById(id);

        if (optionalCompany.isPresent()) {
            Company savedCompany = optionalCompany.get();
            if (!savedCompany.getId().equals(user.getCompany().getId()))
                throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
            if (!user.isOwnsCompany() && !user.getRole().getViewPermissions().contains(PermissionEntity.SETTINGS))
                throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
            if (!user.isOwnsCompany() &&
                    !user.getRole().getEditOtherPermissions().contains(PermissionEntity.SETTINGS))
                throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
            List<String> changed = new ArrayList<>();
            if (company.getName() != null && !Objects.equals(savedCompany.getName(), company.getName())) changed.add("name");
            if (company.getAddress() != null && !Objects.equals(savedCompany.getAddress(), company.getAddress())) changed.add("address");
            if (company.getEmail() != null && !Objects.equals(savedCompany.getEmail(), company.getEmail())) changed.add("email");
            if (company.getPhone() != null && !Objects.equals(savedCompany.getPhone(), company.getPhone())) changed.add("phone");
            if (company.getWebsite() != null && !Objects.equals(savedCompany.getWebsite(), company.getWebsite())) changed.add("website");
            if (company.getCity() != null && !Objects.equals(savedCompany.getCity(), company.getCity())) changed.add("city");
            if (company.getState() != null && !Objects.equals(savedCompany.getState(), company.getState())) changed.add("state");
            if (company.getZipCode() != null && !Objects.equals(savedCompany.getZipCode(), company.getZipCode())) changed.add("zipCode");
            if (company.getLogo() != null && !Objects.equals(savedCompany.getLogo() == null ? null : savedCompany.getLogo().getId(), company.getLogo().getId())) changed.add("logo");
            Company newCompany = companyService.update(id, company);
            configurationAuditService.record(newCompany, user, "COMPANY_PROFILE", id, "UPDATED", changed);
            user.setCompany(newCompany);
            cacheService.putUserInCache(user);
            return companyMapper.toShowDto(newCompany);
        } else throw new CustomException("Company not found", HttpStatus.NOT_FOUND);
    }

    @GetMapping("/{id}/configuration-audit")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public List<CompanyConfigurationAuditDTO> configurationAudit(@PathVariable("id") Long id,
                                                                  HttpServletRequest req) {
        User user = userService.whoami(req);
        ensureCompanyAccess(id, user, false);
        return configurationAuditService.list(user.getCompany());
    }

    @GetMapping("/{id}/legal-profile")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public CompanyLegalProfileDTO getLegalProfile(@PathVariable("id") Long id, HttpServletRequest req) {
        User user = userService.whoami(req);
        ensureCompanyAccess(id, user, false);
        CompanyLegalProfileDTO dto = new CompanyLegalProfileDTO();
        legalProfileRepository.findByCompany_Id(id).ifPresent(profile -> copyLegalProfile(profile, dto));
        return dto;
    }

    @PatchMapping("/{id}/legal-profile")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    @Transactional
    public CompanyLegalProfileDTO patchLegalProfile(@PathVariable("id") Long id,
                                                     @Valid @RequestBody CompanyLegalProfileDTO request,
                                                     HttpServletRequest req) {
        User user = userService.whoami(req);
        ensureCompanyAccess(id, user, true);
        Company company = companyService.findById(id)
                .orElseThrow(() -> new CustomException("Company not found", HttpStatus.NOT_FOUND));
        CompanyLegalProfile profile = legalProfileRepository.findByCompany_Id(id)
                .orElseGet(() -> {
                    CompanyLegalProfile created = new CompanyLegalProfile();
                    created.setCompany(company);
                    return created;
                });
        boolean creating = profile.getId() == null;
        List<String> changed = new ArrayList<>();
        if (request.getLegalName() != null) {
            String value = blankToNull(request.getLegalName());
            if (!Objects.equals(profile.getLegalName(), value)) changed.add("legalName");
            profile.setLegalName(value);
        }
        if (request.getRegistrationCountry() != null) {
            String country = blankToNull(request.getRegistrationCountry());
            country = country == null ? null : country.toUpperCase(java.util.Locale.ROOT);
            if (!Objects.equals(profile.getRegistrationCountry(), country)) changed.add("registrationCountry");
            profile.setRegistrationCountry(country);
        }
        if (request.getBusinessRegistrationNumber() != null) {
            String value = blankToNull(request.getBusinessRegistrationNumber());
            if (!Objects.equals(profile.getBusinessRegistrationNumber(), value)) changed.add("businessRegistrationNumber");
            profile.setBusinessRegistrationNumber(value);
        }
        if (request.getTaxIdentificationNumber() != null) {
            String value = blankToNull(request.getTaxIdentificationNumber());
            if (!Objects.equals(profile.getTaxIdentificationNumber(), value)) changed.add("taxIdentificationNumber");
            profile.setTaxIdentificationNumber(value);
        }
        if (request.getRegisteredAddress() != null) {
            String value = blankToNull(request.getRegisteredAddress());
            if (!Objects.equals(profile.getRegisteredAddress(), value)) changed.add("registeredAddress");
            profile.setRegisteredAddress(value);
        }
        CompanyLegalProfile saved = legalProfileRepository.save(profile);
        if (creating && changed.isEmpty()) changed.add("profile");
        configurationAuditService.record(company, user, "COMPANY_LEGAL_PROFILE", saved.getId(),
                creating ? "CREATED" : "UPDATED", changed);
        CompanyLegalProfileDTO response = new CompanyLegalProfileDTO();
        copyLegalProfile(saved, response);
        return response;
    }

    private void ensureCompanyAccess(Long id, User user, boolean editing) {
        if (user.getCompany() == null || !id.equals(user.getCompany().getId()))
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        if (!user.isOwnsCompany() && !user.getRole().getViewPermissions().contains(PermissionEntity.SETTINGS))
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        if (editing && !user.isOwnsCompany() &&
                !user.getRole().getEditOtherPermissions().contains(PermissionEntity.SETTINGS))
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
    }

    private static String blankToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static void copyLegalProfile(CompanyLegalProfile source, CompanyLegalProfileDTO target) {
        target.setId(source.getId());
        target.setLegalName(source.getLegalName());
        target.setRegistrationCountry(source.getRegistrationCountry());
        target.setBusinessRegistrationNumber(source.getBusinessRegistrationNumber());
        target.setTaxIdentificationNumber(source.getTaxIdentificationNumber());
        target.setRegisteredAddress(source.getRegisteredAddress());
    }

}


