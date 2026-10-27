package com.grash.service;

import com.grash.dto.DocumentTemplateRequest;
import com.grash.exception.CustomException;
import com.grash.model.Company;
import com.grash.model.DocumentTemplate;
import com.grash.model.DocumentTemplateVersion;
import com.grash.model.DocumentType;
import com.grash.model.Role;
import com.grash.model.User;
import com.grash.model.enums.PermissionEntity;
import com.grash.model.enums.DocumentTemplateStatus;
import com.grash.repository.DocumentTemplateRepository;
import com.grash.repository.DocumentTemplateVersionRepository;
import com.grash.repository.DocumentTypeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashSet;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentTemplateServiceTest {
    @Mock private DocumentTemplateRepository templateRepository;
    @Mock private DocumentTemplateVersionRepository versionRepository;
    @Mock private DocumentTypeRepository typeRepository;
    @Mock private ReportTemplateConfigurationValidator validator;
    @Mock private PdfmeTemplateConfigurationValidator pdfmeValidator;
    @InjectMocks private DocumentTemplateService service;

    @Test
    void listIsAlwaysScopedToAuthenticatedCompany() {
        User user = userWithCompany(41L);
        user.getRole().setViewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.SETTINGS)));
        when(templateRepository.findByCompany_IdOrderByUpdatedAtDesc(41L)).thenReturn(java.util.List.of());

        assertTrue(service.list(user).isEmpty());
        verify(templateRepository).findByCompany_IdOrderByUpdatedAtDesc(41L);
        verify(templateRepository, never()).findAll();
    }

    @Test
    void dedicatedDocumentTemplatePermissionCanReadTemplateLibrary() {
        User user = userWithCompany(41L);
        user.getRole().setViewPermissions(
                new HashSet<>(java.util.Set.of(PermissionEntity.DOCUMENT_TEMPLATES)));
        when(templateRepository.findByCompany_IdOrderByUpdatedAtDesc(41L)).thenReturn(java.util.List.of());

        assertTrue(service.list(user).isEmpty());
        verify(templateRepository).findByCompany_IdOrderByUpdatedAtDesc(41L);
    }

    @Test
    void dedicatedDocumentTemplatePermissionCanEditTemplateLibrary() {
        User user = userWithCompany(41L);
        user.getRole().setViewPermissions(
                new HashSet<>(java.util.Set.of(PermissionEntity.DOCUMENT_TEMPLATES)));
        user.getRole().setEditOtherPermissions(
                new HashSet<>(java.util.Set.of(PermissionEntity.DOCUMENT_TEMPLATES)));
        when(templateRepository.findByIdAndCompany_Id(77L, 41L)).thenReturn(Optional.empty());

        CustomException exception = assertThrows(CustomException.class, () -> service.archive(77L, user));

        assertEquals(org.springframework.http.HttpStatus.NOT_FOUND, exception.getHttpStatus());
        verify(templateRepository).findByIdAndCompany_Id(77L, 41L);
    }

    @Test
    void dedicatedCreatePermissionAllowsTemplateCreationWithoutEditPermission() throws Exception {
        User user = userWithCompany(41L);
        user.getRole().setCreatePermissions(
                new HashSet<>(java.util.Set.of(PermissionEntity.DOCUMENT_TEMPLATES)));
        DocumentType type = new DocumentType();
        type.setCode("WORK_ORDER");
        type.setProviderCode("WORK_ORDER");
        when(typeRepository.findByCodeAndCompanyIsNull("WORK_ORDER"))
                .thenReturn(Optional.of(type));
        when(validator.validateDraft(any(), eq("WORK_ORDER"), eq("WORK_ORDER")))
                .thenThrow(new IllegalStateException("configuration validation reached"));
        DocumentTemplateRequest request = new DocumentTemplateRequest();
        request.setDocumentTypeCode("WORK_ORDER");
        request.setCode("FIELD_REPORT");
        request.setName("Field report");
        request.setConfiguration(new com.fasterxml.jackson.databind.ObjectMapper().readTree("{}"));

        IllegalStateException exception = assertThrows(
                IllegalStateException.class, () -> service.create(request, user));

        assertEquals("configuration validation reached", exception.getMessage());
        verify(typeRepository).findByCodeAndCompanyIsNull("WORK_ORDER");
        verify(validator).validateDraft(any(), eq("WORK_ORDER"), eq("WORK_ORDER"));
    }

    @Test
    void creationRequiresExistingSettingsEditPermission() {
        User user = userWithCompany(41L);
        DocumentTemplateRequest request = new DocumentTemplateRequest();

        CustomException exception = assertThrows(CustomException.class, () -> service.create(request, user));

        assertEquals(org.springframework.http.HttpStatus.FORBIDDEN, exception.getHttpStatus());
        verifyNoInteractions(typeRepository, templateRepository, versionRepository, validator);
    }

    @Test
    void templateLookupCannotCrossTenantBoundary() {
        User user = userWithCompany(41L);
        user.getRole().setViewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.SETTINGS)));
        user.getRole().setEditOtherPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.SETTINGS)));
        when(templateRepository.findByIdAndCompany_Id(77L, 41L)).thenReturn(Optional.empty());

        CustomException exception = assertThrows(CustomException.class, () -> service.archive(77L, user));

        assertEquals(org.springframework.http.HttpStatus.NOT_FOUND, exception.getHttpStatus());
        verify(templateRepository).findByIdAndCompany_Id(77L, 41L);
    }

    @Test
    void versionHistoryIsScopedToAuthorizedCompanyTemplate() {
        User user = userWithCompany(41L);
        user.getRole().setViewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.SETTINGS)));
        DocumentType type = new DocumentType(); type.setCode("WORK_ORDER"); type.setProviderCode("WORK_ORDER");
        DocumentTemplateVersion published = new DocumentTemplateVersion();
        published.setId(18L); published.setVersionNumber(2); published.setStatus(DocumentTemplateStatus.PUBLISHED);
        DocumentTemplate template = new DocumentTemplate();
        template.setId(77L); template.setCompany(user.getCompany()); template.setDocumentType(type);
        template.setPublishedVersion(published);
        when(templateRepository.findByIdAndCompany_Id(77L, 41L)).thenReturn(Optional.of(template));
        when(versionRepository.findByTemplate_IdOrderByVersionNumberDesc(77L)).thenReturn(java.util.List.of(published));

        var result = service.listVersions(77L, user);

        assertEquals(1, result.size());
        assertEquals(2, result.get(0).versionNumber());
        assertTrue(result.get(0).currentPublished());
        verify(templateRepository).findByIdAndCompany_Id(77L, 41L);
        verify(versionRepository).findByTemplate_IdOrderByVersionNumberDesc(77L);
    }

    @Test
    void publishingNewVersionPreservesExistingDefaultWhenNotChangingDefaultSelection() throws Exception {
        User user = userWithCompany(41L);
        user.getRole().setViewPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.SETTINGS)));
        user.getRole().setEditOtherPermissions(new HashSet<>(java.util.Set.of(PermissionEntity.SETTINGS)));
        DocumentType type = new DocumentType(); type.setCode("WORK_ORDER"); type.setProviderCode("WORK_ORDER");
        DocumentTemplateVersion draft = new DocumentTemplateVersion();
        draft.setId(18L); draft.setVersionNumber(2); draft.setStatus(DocumentTemplateStatus.DRAFT);
        draft.setConfiguration(new com.fasterxml.jackson.databind.ObjectMapper().readTree("{}"));
        DocumentTemplate template = new DocumentTemplate();
        template.setId(77L); template.setCompany(user.getCompany()); template.setDocumentType(type);
        template.setStatus(DocumentTemplateStatus.PUBLISHED); template.setDefault(true); template.setDraftVersion(draft);
        when(templateRepository.findByIdAndCompany_Id(77L, 41L)).thenReturn(Optional.of(template));
        when(validator.validate(draft.getConfiguration(), "WORK_ORDER", "WORK_ORDER"))
                .thenReturn(draft.getConfiguration());
        when(versionRepository.saveAndFlush(draft)).thenReturn(draft);
        when(templateRepository.save(template)).thenReturn(template);

        var result = service.publish(77L, false, user);

        assertTrue(result.isDefault());
        assertTrue(template.isDefault());
        assertSame(draft, template.getPublishedVersion());
        assertNull(template.getDraftVersion());
        assertEquals(DocumentTemplateStatus.PUBLISHED, draft.getStatus());
        verify(templateRepository, never()).clearDefaultForType(anyLong(), anyLong());
    }

    private User userWithCompany(Long companyId) {
        Company company = new Company();
        company.setId(companyId);
        Role role = new Role();
        role.setViewPermissions(new HashSet<>());
        role.setEditOtherPermissions(new HashSet<>());
        User user = new User();
        user.setCompany(company);
        user.setRole(role);
        user.setOwnsCompany(false);
        user.setId(12L);
        return user;
    }
}
