package com.grash.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.grash.dto.DocumentTemplateDTO;
import com.grash.dto.DocumentTemplateRequest;
import com.grash.dto.DocumentTemplateVersionDTO;
import com.grash.dto.DocumentTypeDTO;
import com.grash.exception.CustomException;
import com.grash.model.DocumentTemplate;
import com.grash.model.DocumentTemplateVersion;
import com.grash.model.DocumentType;
import com.grash.model.User;
import com.grash.model.WorkOrder;
import com.grash.model.enums.DocumentTemplateStatus;
import com.grash.model.enums.PermissionEntity;
import com.grash.repository.DocumentTemplateRepository;
import com.grash.repository.DocumentTemplateVersionRepository;
import com.grash.repository.DocumentTypeRepository;
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
    private final DocumentTypeRepository typeRepository;
    private final ReportTemplateConfigurationValidator validator;
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
        result.addAll(typeRepository.findByActiveTrueAndCompany_Id(user.getCompany().getId()));
        return result.stream().map(DocumentTypeDTO::from).toList();
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
        JsonNode configuration = validator.validate(version.getConfiguration(), template.getDocumentType().getCode(),
                template.getDocumentType().getProviderCode());
        WorkOrder order = workOrderService.findById(workOrderId)
                .filter(wo -> wo.getCompany() != null && wo.getCompany().getId().equals(user.getCompany().getId()))
                .orElseThrow(() -> new CustomException("Work order not found", HttpStatus.NOT_FOUND));
        if (!order.canBeViewedBy(user)) throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        var context = documentContextResolver.resolve(order);
        var fields = new java.util.LinkedHashSet<String>();
        configuration.path("visibleFields").forEach(field -> fields.add(field.asText()));
        return providerRegistry.require(template.getDocumentType().getProviderCode()).resolve(order, context, fields);
    }

    @Transactional
    public DocumentTemplateDTO create(DocumentTemplateRequest request, User user) {
        requireCreate(user);
        DocumentType type = findType(request.getDocumentTypeCode(), user);
        JsonNode validated = validator.validate(request.getConfiguration(), type.getCode(), type.getProviderCode());
        DocumentTemplate template = new DocumentTemplate();
        template.setCompany(user.getCompany());
        template.setDocumentType(type);
        template.setCode(request.getCode().trim());
        template.setName(request.getName().trim());
        template.setDescription(trimToNull(request.getDescription()));
        template.setStyle(validated.path("style").asText());
        template.setEngine("QPM_NATIVE");
        template.setDefaultScope("COMPANY");
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
        JsonNode validated = validator.validate(request.getConfiguration(), template.getDocumentType().getCode(),
                template.getDocumentType().getProviderCode());
        template.setName(request.getName().trim());
        template.setDescription(trimToNull(request.getDescription()));
        template.setStyle(validated.path("style").asText());
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
        validator.validate(draft.getConfiguration(), template.getDocumentType().getCode(),
                template.getDocumentType().getProviderCode());
        if (makeDefault) templateRepository.clearDefaultForType(user.getCompany().getId(), template.getDocumentType().getId());
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

    private DocumentTemplate findTemplate(Long id, User user) {
        return templateRepository.findByIdAndCompany_Id(id, user.getCompany().getId())
                .orElseThrow(() -> new CustomException("Document template not found", HttpStatus.NOT_FOUND));
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
        version.setSchemaVersion("1.0");
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

    private void bad(String message) {
        throw new CustomException(message, HttpStatus.BAD_REQUEST);
    }
}
