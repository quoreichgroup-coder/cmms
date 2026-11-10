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
    private final com.grash.repository.PartQuantityRepository partQuantityRepository;

    /**
     * Site whose identity (logo, name, language, time zone) a document carries. Purchase orders and
     * requisitions have no site of their own: the site of their lines is used when all lines share one,
     * a requisition raised from a work order takes that work order's site, otherwise the company identity.
     */
    public Site siteOf(Object source) {
        if (source instanceof WorkOrderBase workOrderBase) return workOrderBase.getSite();
        if (source instanceof PurchaseRequisition requisition) {
            if (requisition.getSourceWorkOrder() != null && requisition.getSourceWorkOrder().getSite() != null)
                return requisition.getSourceWorkOrder().getSite();
            return singleSite(requisition.getLines() == null ? java.util.List.<Site>of()
                    : requisition.getLines().stream().map(PurchaseRequisitionLine::getSite).toList());
        }
        if (source instanceof PurchaseOrder order) {
            if (order.getId() == null) return null;
            return singleSite(partQuantityRepository.findDocumentLinesByPurchaseOrderId(order.getId()).stream()
                    .map(PartQuantity::getSite).toList());
        }
        return null;
    }

    static Site singleSite(java.util.Collection<Site> sites) {
        if (sites == null || sites.isEmpty() || sites.stream().anyMatch(java.util.Objects::isNull)) return null;
        java.util.Set<Long> ids = sites.stream().map(Site::getId).collect(java.util.stream.Collectors.toSet());
        return ids.size() == 1 && !ids.contains(null) ? sites.iterator().next() : null;
    }

    public DocumentContext resolve(WorkOrderBase source) {
        return resolve(source.getCompany(), source.getSite());
    }

    public DocumentContext resolve(Company company, Site site) {
        CompanyLegalProfile legal = legalProfileRepository.findByCompany_Id(company.getId()).orElse(null);
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
