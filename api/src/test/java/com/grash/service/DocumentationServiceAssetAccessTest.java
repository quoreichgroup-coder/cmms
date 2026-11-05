package com.grash.service;

import com.grash.exception.CustomException;
import com.grash.factory.StorageServiceFactory;
import com.grash.model.Company;
import com.grash.model.DocumentationArticle;
import com.grash.model.DocumentationAsset;
import com.grash.model.DocumentationCategory;
import com.grash.model.Role;
import com.grash.model.User;
import com.grash.model.enums.DocumentationStatus;
import com.grash.model.enums.PermissionEntity;
import com.grash.repository.DocumentationArticleRepository;
import com.grash.repository.DocumentationAssetRepository;
import com.grash.repository.DocumentationCategoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DocumentationServiceAssetAccessTest {
    private static final long COMPANY_ID = 42L;
    private static final String ASSET_ID = "asset-123";

    @Mock private DocumentationCategoryRepository categoryRepository;
    @Mock private DocumentationArticleRepository articleRepository;
    @Mock private DocumentationAssetRepository assetRepository;
    @Mock private StorageServiceFactory storageServiceFactory;

    private DocumentationService service;
    private User reader;
    private DocumentationAsset asset;

    @BeforeEach
    void setUp() {
        service = new DocumentationService(categoryRepository, articleRepository, assetRepository,
                storageServiceFactory);
        Company company = new Company();
        company.setId(COMPANY_ID);
        reader = new User();
        reader.setCompany(company);
        reader.setRole(Role.builder()
                .viewPermissions(Set.of(PermissionEntity.WORK_ORDERS))
                .editOtherPermissions(Set.of())
                .build());
        asset = new DocumentationAsset();
        asset.setPublicId(ASSET_ID);
        asset.setCompany(company);
    }

    @Test
    void readerCanFetchAnImageReferencedByAnArticleTheyCanRead() {
        DocumentationCategory category = new DocumentationCategory();
        category.setActive(true);
        DocumentationArticle article = new DocumentationArticle();
        article.setCategory(category);
        article.setRequiredPermission("WORK_ORDERS");

        when(assetRepository.findByPublicId(ASSET_ID)).thenReturn(Optional.of(asset));
        when(articleRepository.findByCompany_IdAndStatusAndPublishedContentContaining(
                COMPANY_ID, DocumentationStatus.PUBLISHED, "qpm-help-asset:" + ASSET_ID))
                .thenReturn(List.of(article));

        assertSame(asset, service.getReadableAsset(ASSET_ID, reader));
    }

    @Test
    void readerCannotFetchAnImageReferencedOnlyByAnUnreadableArticle() {
        DocumentationCategory category = new DocumentationCategory();
        category.setActive(true);
        category.setRequiredPermission("SETTINGS");
        DocumentationArticle article = new DocumentationArticle();
        article.setCategory(category);

        when(assetRepository.findByPublicId(ASSET_ID)).thenReturn(Optional.of(asset));
        when(articleRepository.findByCompany_IdAndStatusAndPublishedContentContaining(
                COMPANY_ID, DocumentationStatus.PUBLISHED, "qpm-help-asset:" + ASSET_ID))
                .thenReturn(List.of(article));

        CustomException error = assertThrows(CustomException.class,
                () -> service.getReadableAsset(ASSET_ID, reader));

        assertEquals(HttpStatus.NOT_FOUND, error.getHttpStatus());
    }

    @Test
    void readerCannotFetchAnImageFromAnotherCompany() {
        Company otherCompany = new Company();
        otherCompany.setId(COMPANY_ID + 1);
        asset.setCompany(otherCompany);
        when(assetRepository.findByPublicId(ASSET_ID)).thenReturn(Optional.of(asset));

        CustomException error = assertThrows(CustomException.class,
                () -> service.getReadableAsset(ASSET_ID, reader));

        assertEquals(HttpStatus.NOT_FOUND, error.getHttpStatus());
        verify(articleRepository, never()).findByCompany_IdAndStatusAndPublishedContentContaining(
                COMPANY_ID, DocumentationStatus.PUBLISHED, "qpm-help-asset:" + ASSET_ID);
    }
}
