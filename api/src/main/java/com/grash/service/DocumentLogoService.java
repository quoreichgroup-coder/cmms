package com.grash.service;

import com.grash.factory.StorageServiceFactory;
import com.grash.model.Company;
import com.grash.model.File;
import com.grash.model.Site;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Base64;
import java.util.Objects;

/**
 * Logo printed on generated documents: the document site's logo when it has one, otherwise the company logo.
 * Every renderer (QPM native and PDFME) goes through this class so the choice and the safety checks are the same.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentLogoService {
    public static final int MAX_LOGO_BYTES = 512 * 1024;

    private final StorageServiceFactory storageServiceFactory;

    /** The logo file to print, or null; a file that does not belong to the company is never used. */
    public File logoFor(Company company, Site site) {
        if (company == null) return null;
        if (site != null && site.getLogo() != null && belongsTo(site.getLogo(), company)
                && site.getCompany() != null && Objects.equals(site.getCompany().getId(), company.getId())) {
            return site.getLogo();
        }
        File companyLogo = company.getLogo();
        return companyLogo != null && belongsTo(companyLogo, company) ? companyLogo : null;
    }

    /** PNG/JPEG data URI of the logo for PDFME, or null when missing, too large or not an image. */
    public String logoDataUri(Company company, Site site) {
        File logo = logoFor(company, site);
        if (logo == null) return null;
        try {
            byte[] bytes = storageServiceFactory.getStorageService().download(logo);
            if (bytes == null || bytes.length == 0 || bytes.length > MAX_LOGO_BYTES) {
                log.warn("Document logo is empty or exceeds {} bytes; omitted, companyId={}, siteId={}",
                        MAX_LOGO_BYTES, company.getId(), site == null ? null : site.getId());
                return null;
            }
            String mimeType = imageMimeType(bytes);
            if (mimeType == null) {
                log.warn("Document logo is not a PNG or JPEG; omitted, companyId={}, siteId={}",
                        company.getId(), site == null ? null : site.getId());
                return null;
            }
            return "data:" + mimeType + ";base64," + Base64.getEncoder().encodeToString(bytes);
        } catch (RuntimeException exception) {
            log.warn("Document logo could not be loaded; omitted, companyId={}, siteId={}",
                    company.getId(), site == null ? null : site.getId());
            return null;
        }
    }

    /** PNG or JPEG detected from the file signature (the declared type is not trusted). */
    public static String imageMimeType(byte[] bytes) {
        if (bytes == null) return null;
        if (bytes.length >= 8 && (bytes[0] & 0xff) == 0x89 && bytes[1] == 'P'
                && bytes[2] == 'N' && bytes[3] == 'G' && bytes[4] == 0x0d
                && bytes[5] == 0x0a && bytes[6] == 0x1a && bytes[7] == 0x0a) return "image/png";
        if (bytes.length >= 3 && (bytes[0] & 0xff) == 0xff && (bytes[1] & 0xff) == 0xd8
                && (bytes[2] & 0xff) == 0xff) return "image/jpeg";
        return null;
    }

    private static boolean belongsTo(File file, Company company) {
        return file.getCompany() != null && Objects.equals(file.getCompany().getId(), company.getId());
    }
}
