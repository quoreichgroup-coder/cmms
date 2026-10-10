package com.grash.service;

import com.grash.model.*;
import com.grash.model.abstracts.WorkOrderBase;
import com.grash.model.enums.Language;
import com.grash.repository.CompanyLegalProfileRepository;
import com.grash.utils.Helper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Locale;

/** Resolves the company/site identity and regional settings used by generated documents. */
@Service
@RequiredArgsConstructor
public class DocumentContextResolver {
    private final CompanyLegalProfileRepository legalProfileRepository;

    public DocumentContext resolve(WorkOrderBase source) {
        Company company = source.getCompany();
        CompanyLegalProfile legal = legalProfileRepository.findByCompany_Id(company.getId()).orElse(null);
        Site site = source.getSite();
        Language language = site != null && site.getDocumentLanguage() != null
                ? site.getDocumentLanguage() : company.getCompanySettings().getGeneralPreferences().getLanguage();
        String address = legal != null && legal.getRegisteredAddress() != null
                ? legal.getRegisteredAddress() : company.getAddress();
        String timeZone = site != null && site.getTimeZone() != null
                ? site.getTimeZone() : company.getCompanySettings().getGeneralPreferences().getTimeZone();
        String currency = company.getCompanySettings().getGeneralPreferences().getCurrency() == null
                ? "" : company.getCompanySettings().getGeneralPreferences().getCurrency().getCode();
        return new DocumentContext(company.getName(), legal == null ? null : legal.getLegalName(),
                company.getPhone(), company.getEmail(), address,
                legal == null ? null : legal.getBusinessRegistrationNumber(),
                legal == null ? null : legal.getTaxIdentificationNumber(),
                currency, company.getCompanySettings().getGeneralPreferences().getDateFormat(),
                timeZone, language, Helper.getLocale(language), site == null ? null : site.getId(),
                site == null ? null : site.getName());
    }

    public record DocumentContext(String companyName, String legalName, String phone, String email,
                                  String registeredAddress, String registrationNumber, String taxNumber,
                                  String currency, com.grash.model.enums.DateFormat dateFormat, String timeZone,
                                  Language language, Locale locale, Long siteId, String siteName) { }
}
