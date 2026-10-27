package com.grash.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.grash.dto.DocumentTemplateDTO;
import com.grash.dto.DocumentTemplateRequest;
import com.grash.dto.DocumentTypeRequest;
import com.grash.dto.DocumentTemplateVersionDTO;
import com.grash.dto.DocumentTypeDTO;
import com.grash.exception.CustomException;
import com.grash.model.DocumentTemplate;
import com.grash.model.DocumentTemplateVersion;
import com.grash.model.DocumentType;
import com.grash.model.User;
import com.grash.model.WorkOrder;
import com.grash.model.Site;
import com.grash.model.enums.DocumentTemplateStatus;
import com.grash.model.enums.PermissionEntity;
import com.grash.repository.DocumentTemplateRepository;
import com.grash.repository.DocumentTemplateVersionRepository;
import com.grash.repository.GeneratedDocumentRepository;
import com.grash.repository.DocumentTypeRepository;
import com.grash.repository.SiteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DocumentTemplateService {
    private final DocumentTemplateRepository templateRepository;
    private final DocumentTemplateVersionRepository versionRepository;
    private final GeneratedDocumentRepository generatedDocumentRepository;
    private final DocumentTypeRepository typeRepository;
    private final SiteRepository siteRepository;
    private final ReportTemplateConfigurationValidator validator;
    private final PdfmeTemplateConfigurationValidator pdfmeValidator;
    private final WorkOrderService workOrderService;
    private final DocumentContextResolver documentContextResolver;
    private final DocumentDataProviderRegistry providerRegistry;

    @Transactional(readOnly = true)
    public List<DocumentTemplateDTO> list(User user) {
        requireView(user);
        return templateRepository.findByCompany_IdOrderByUpdatedAtDesc(user.getCompany().getId())
                .stream().map(DocumentTemplateDTO::from).toList();
    }

    @Transactional(readOnly = true)
    public List<DocumentTypeDTO> listTypes(User user) {
        requireView(user);
        List<DocumentType> result = new java.util.ArrayList<>(typeRepository.findByActiveTrueAndCompanyIsNull());
        result.addAll(typeRepository.findByCompany_Id(user.getCompany().getId()));
        return result.stream().map(DocumentTypeDTO::from).toList();
    }

    @Transactional
    public DocumentTypeDTO createType(DocumentTypeRequest request, User user) {
        requireCreate(user);
        String name = request.getName().trim();
        String providerCode = request.getProviderCode();
        if (name.isBlank() || !providerRegistry.contains(providerCode))
            throw new CustomException("Unsupported document type", HttpStatus.BAD_REQUEST);

        String slug = java.text.Normalizer.normalize(name, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toUpperCase(java.util.Locale.ROOT)
                .replaceAll("[^A-Z0-9]+", "_").replaceAll("^_+|_+$", "");
        if (slug.isBlank()) slug = providerCode;
        String baseCode = ("CUSTOM_" + slug).substring(0, Math.min(60, "CUSTOM_".length() + slug.length()));
        String code = baseCode;
        int suffix = 2;
        while (typeRepository.findByCodeAndCompany_Id(code, user.getCompany().getId()).isPresent()
                || typeRepository.findByCodeAndCompanyIsNull(code).isPresent()) {
            String suffixText = "_" + suffix++;
            code = baseCode.substring(0, Math.min(baseCode.length(), 60 - suffixText.length())) + suffixText;
        }

        DocumentType type = new DocumentType();
        type.setCompany(user.getCompany());
        type.setCode(code);
        type.setName(name);
        type.setCategory(providerCode);
        type.setDescription(trimToNull(request.getDescription()));
        type.setProviderCode(providerCode);
        type.setSystemManaged(false);
        type.setActive(true);
        return DocumentTypeDTO.from(typeRepository.save(type));
    }

    @Transactional
    public DocumentTypeDTO updateType(Long id, DocumentTypeRequest request, User user) {
        requireEdit(user);
        DocumentType type = typeRepository.findByIdAndCompany_Id(id, user.getCompany().getId())
                .orElseThrow(() -> new CustomException("Document type not found", HttpStatus.NOT_FOUND));
        if (type.isSystemManaged())
            throw new CustomException("System document types cannot be edited", HttpStatus.CONFLICT);
        if (request.getProviderCode() != null && !request.getProviderCode().equals(type.getProviderCode()))
            bad("Document type source cannot be changed");
        String name = request.getName().trim();
        if (name.isBlank()) bad("Document type name is required");
        type.setName(name);
        type.setDescription(trimToNull(request.getDescription()));
        if (Boolean.FALSE.equals(request.getActive())) {
            if (templateRepository.existsByCompany_IdAndDocumentType_Id(user.getCompany().getId(), type.getId()))
                throw new CustomException("Delete or move templates using this type before deactivating it",
                        HttpStatus.CONFLICT);
            type.setActive(false);
        } else if (Boolean.TRUE.equals(request.getActive())) {
            type.setActive(true);
        }
        return DocumentTypeDTO.from(typeRepository.save(type));
    }

    @Transactional(readOnly = true)
    public List<DocumentTemplateVersionDTO> listVersions(Long templateId, User user) {
        requireView(user);
        DocumentTemplate template = findTemplate(templateId, user);
        return versionRepository.findByTemplate_IdOrderByVersionNumberDesc(templateId).stream()
                .map(version -> DocumentTemplateVersionDTO.from(version, template)).toList();
    }

    @Transactional(readOnly = true)
    public java.util.Map<String, Object> previewData(Long templateId, Long workOrderId, User user) {
        requireView(user);
        DocumentTemplate template = findTemplate(templateId, user);
        DocumentTemplateVersion version = template.getDraftVersion() != null
                ? template.getDraftVersion() : template.getPublishedVersion();
        if (version == null) bad("Template has no previewable version");
        JsonNode configuration = validateConfiguration(version.getConfiguration(), template.getDocumentType());
        WorkOrder order = workOrderService.findById(workOrderId)
                .filter(wo -> wo.getCompany() != null && wo.getCompany().getId().equals(user.getCompany().getId()))
                .orElseThrow(() -> new CustomException("Work order not found", HttpStatus.NOT_FOUND));
        if (!order.canBeViewedBy(user)) throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        requireSiteScope(template, order.getSite());
        var context = documentContextResolver.resolve(order);
        var fields = new java.util.LinkedHashSet<>(PdfmeTemplateConfigurationValidator.isPdfme(configuration)
                ? pdfmeValidator.dataBindings(configuration) : validator.visibleFields(configuration));
        return providerRegistry.require(template.getDocumentType().getProviderCode()).resolve(order, context, fields);
    }

    @Transactional
    public DocumentTemplateDTO create(DocumentTemplateRequest request, User user) {
        requireCreate(user);
        DocumentType type = findType(request.getDocumentTypeCode(), user);
        JsonNode validated = validateDraft(request.getConfiguration(), type);
        DocumentTemplate template = new DocumentTemplate();
        template.setCompany(user.getCompany());
        template.setDocumentType(type);
        template.setCode(request.getCode().trim());
        template.setName(request.getName().trim());
        template.setDescription(trimToNull(request.getDescription()));
        template.setStyle(validated.path("style").asText("MODERN"));
        template.setEngine(PdfmeTemplateConfigurationValidator.isPdfme(validated) ? "PDFME" : "QPM_NATIVE");
        applyScope(template, request, user, true);
        template.setStatus(DocumentTemplateStatus.DRAFT);
        template = templateRepository.saveAndFlush(template);

        DocumentTemplateVersion version = newVersion(template, 1, validated, user);
        template.setDraftVersion(versionRepository.save(version));
        return DocumentTemplateDTO.from(templateRepository.save(template));
    }

    @Transactional
    public DocumentTemplateDTO update(Long id, DocumentTemplateRequest request, User user) {
        requireEdit(user);
        DocumentTemplate template = findTemplate(id, user);
        if (template.getStatus() == DocumentTemplateStatus.ARCHIVED) bad("Archived templates cannot be edited");
        if (!template.getCode().equals(request.getCode().trim())) bad("Template code cannot be changed");
        if (!template.getDocumentType().getCode().equals(request.getDocumentTypeCode())) bad("Document type cannot be changed");
        JsonNode validated = validateDraft(request.getConfiguration(), template.getDocumentType());
        template.setName(request.getName().trim());
        template.setDescription(trimToNull(request.getDescription()));
        applyScope(template, request, user, false);
        template.setStyle(validated.path("style").asText(template.getStyle()));
        template.setEngine(PdfmeTemplateConfigurationValidator.isPdfme(validated) ? "PDFME" : "QPM_NATIVE");
        DocumentTemplateVersion draft = template.getDraftVersion();
        if (draft == null) {
            int nextVersion = versionRepository.findFirstByTemplate_IdOrderByVersionNumberDesc(id)
                    .map(DocumentTemplateVersion::getVersionNumber).orElse(0) + 1;
            draft = newVersion(template, nextVersion, validated, user);
            draft = versionRepository.save(draft);
            template.setDraftVersion(draft);
        } else {
            if (draft.getStatus() != DocumentTemplateStatus.DRAFT) bad("Only a draft version can be edited");
            draft.setConfiguration(validated.deepCopy());
            draft.setSchemaVersion(schemaVersion(validated));
            versionRepository.save(draft);
        }
        return DocumentTemplateDTO.from(templateRepository.save(template));
    }

    @Transactional
    public DocumentTemplateDTO publish(Long id, boolean makeDefault, User user) {
        requireEdit(user);
        DocumentTemplate template = findTemplate(id, user);
        if (template.getStatus() == DocumentTemplateStatus.ARCHIVED) bad("Archived templates cannot be published");
        DocumentTemplateVersion draft = template.getDraftVersion();
        if (draft == null || draft.getStatus() != DocumentTemplateStatus.DRAFT) bad("A valid draft is required before publishing");
        validateConfiguration(draft.getConfiguration(), template.getDocumentType());
        if (makeDefault) templateRepository.clearDefaultForScope(user.getCompany().getId(),
                template.getDocumentType().getId(), template.getDefaultScope(),
                template.getSite() == null ? null : template.getSite().getId());
        draft.setStatus(DocumentTemplateStatus.PUBLISHED);
        draft.setPublishedBy(user.getId());
        draft.setPublishedAt(new Date());
        versionRepository.saveAndFlush(draft);
        template.setPublishedVersion(draft);
        template.setDraftVersion(null);
        template.setStatus(DocumentTemplateStatus.PUBLISHED);
        template.setDefault(makeDefault || template.isDefault());
        return DocumentTemplateDTO.from(templateRepository.save(template));
    }

    @Transactional
    public DocumentTemplateDTO archive(Long id, User user) {
        requireEdit(user);
        DocumentTemplate template = findTemplate(id, user);
        template.setStatus(DocumentTemplateStatus.ARCHIVED);
        template.setDefault(false);
        template.setDraftVersion(null);
        return DocumentTemplateDTO.from(templateRepository.save(template));
    }

    @Transactional
    public void delete(Long id, User user) {
        requireEdit(user);
        DocumentTemplate template = findTemplate(id, user);
        List<DocumentTemplateVersion> versions = versionRepository
                .findByTemplate_IdOrderByVersionNumberDesc(id);

        if (versions.stream().anyMatch(version -> generatedDocumentRepository.existsByTemplateVersionEntity_Id(version.getId()))) {
            throw new CustomException("A template version is referenced by an issued document",
                    HttpStatus.CONFLICT);
        }

        // Clear restrictive template-to-version foreign keys before removing draft snapshots.
        template.setDraftVersion(null);
        template.setPublishedVersion(null);
        template.setDefault(false);
        templateRepository.saveAndFlush(template);
        versionRepository.deleteAll(versions);
        versionRepository.flush();
        templateRepository.delete(template);
    }

    private DocumentTemplate findTemplate(Long id, User user) {
        return templateRepository.findByIdAndCompany_Id(id, user.getCompany().getId())
                .orElseThrow(() -> new CustomException("Document template not found", HttpStatus.NOT_FOUND));
    }

    private JsonNode validateDraft(JsonNode configuration, DocumentType type) {
        if (PdfmeTemplateConfigurationValidator.isPdfme(configuration))
            return pdfmeValidator.validate(configuration, type.getCode(), type.getProviderCode());
        return validator.validateDraft(configuration, type.getCode(), type.getProviderCode());
    }

    private JsonNode validateConfiguration(JsonNode configuration, DocumentType type) {
        if (PdfmeTemplateConfigurationValidator.isPdfme(configuration))
            return pdfmeValidator.validate(configuration, type.getCode(), type.getProviderCode());
        return validator.validate(configuration, type.getCode(), type.getProviderCode());
    }

    private String schemaVersion(JsonNode configuration) {
        return PdfmeTemplateConfigurationValidator.isPdfme(configuration)
                ? "pdfme-" + configuration.path("pdfmeVersion").asText("6.2.8")
                : configuration.path("schemaVersion").asText("1.0");
    }

    private DocumentType findType(String code, User user) {
        return typeRepository.findByCodeAndCompanyIsNull(code)
                .or(() -> typeRepository.findByCodeAndCompany_Id(code, user.getCompany().getId()))
                .filter(DocumentType::isActive)
                .orElseThrow(() -> new CustomException("Document type not found", HttpStatus.NOT_FOUND));
    }

    private DocumentTemplateVersion newVersion(DocumentTemplate template, int number, JsonNode config, User user) {
        DocumentTemplateVersion version = new DocumentTemplateVersion();
        version.setTemplate(template);
        version.setVersionNumber(number);
        version.setSchemaVersion(schemaVersion(config));
        version.setConfiguration(config.deepCopy());
        version.setStatus(DocumentTemplateStatus.DRAFT);
        version.setCreatedBy(user.getId());
        version.setCreatedAt(new Date());
        return version;
    }

    private void requireView(User user) {
        boolean canViewSettings = user.getRole() != null
                && user.getRole().getViewPermissions().contains(PermissionEntity.SETTINGS);
        boolean canViewTemplates = user.getRole() != null
                && user.getRole().getViewPermissions().contains(PermissionEntity.DOCUMENT_TEMPLATES);
        if (user.getCompany() == null || (!user.isOwnsCompany() && !canViewSettings && !canViewTemplates))
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
    }

    private void requireEdit(User user) {
        boolean canViewSettings = user.getRole() != null
                && user.getRole().getViewPermissions().contains(PermissionEntity.SETTINGS);
        boolean canEditSettings = user.getRole() != null
                && user.getRole().getEditOtherPermissions().contains(PermissionEntity.SETTINGS);
        boolean canViewTemplates = user.getRole() != null
                && user.getRole().getViewPermissions().contains(PermissionEntity.DOCUMENT_TEMPLATES);
        boolean canEditTemplates = user.getRole() != null
                && user.getRole().getEditOtherPermissions().contains(PermissionEntity.DOCUMENT_TEMPLATES);
        if (user.getCompany() == null || (!user.isOwnsCompany()
                && !((canViewSettings && canEditSettings) || (canViewTemplates && canEditTemplates))))
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
    }

    private void requireCreate(User user) {
        boolean canCreateTemplates = user.getRole() != null
                && user.getRole().getCreatePermissions().contains(PermissionEntity.DOCUMENT_TEMPLATES);
        if (user.getCompany() == null || (!user.isOwnsCompany()
                && !canCreateTemplates && !canManageWithSettings(user)))
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
    }

    private boolean canManageWithSettings(User user) {
        return user.getRole() != null
                && user.getRole().getViewPermissions().contains(PermissionEntity.SETTINGS)
                && user.getRole().getEditOtherPermissions().contains(PermissionEntity.SETTINGS);
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }

    private void applyScope(DocumentTemplate template, DocumentTemplateRequest request, User user, boolean creating) {
        if (!creating && request.getSiteId() == null && request.getDefaultScope() == null) return;
        if (request.getSiteId() != null) {
            Site site = siteRepository.findById(request.getSiteId())
                    .filter(candidate -> candidate.getCompany() != null
                            && candidate.getCompany().getId().equals(user.getCompany().getId()))
                    .orElseThrow(() -> new CustomException("Site not found", HttpStatus.NOT_FOUND));
            if (request.getDefaultScope() != null && !"SITE".equals(request.getDefaultScope()))
                bad("Site-scoped templates must use SITE scope");
            template.setSite(site);
            template.setDefaultScope("SITE");
            return;
        }
        String scope = request.getDefaultScope() == null ? "COMPANY" : request.getDefaultScope();
        if (!"COMPANY".equals(scope)) bad("A site-scoped template must select a site");
        template.setSite(null);
        template.setDefaultScope("COMPANY");
    }

    private void requireSiteScope(DocumentTemplate template, Site site) {
        if ("SITE".equals(template.getDefaultScope())
                && (template.getSite() == null || site == null
                || !template.getSite().getId().equals(site.getId()))) {
            throw new CustomException("Document template is not available for this site", HttpStatus.NOT_FOUND);
        }
    }

    private void bad(String message) {
        throw new CustomException(message, HttpStatus.BAD_REQUEST);
    }
}
