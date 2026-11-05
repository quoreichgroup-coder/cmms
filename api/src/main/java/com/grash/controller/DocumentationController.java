package com.grash.controller;

import com.grash.dto.DocumentationArticleDTO;
import com.grash.dto.DocumentationArticleRequest;
import com.grash.dto.DocumentationAssetDTO;
import com.grash.dto.DocumentationCategoryDTO;
import com.grash.dto.DocumentationCategoryRequest;
import com.grash.model.DocumentationAsset;
import com.grash.model.User;
import com.grash.service.DocumentationService;
import com.grash.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/documentation")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ROLE_CLIENT')")
public class DocumentationController {
    private final DocumentationService documentationService;

    @GetMapping("/categories")
    public List<DocumentationCategoryDTO> categories(@CurrentUser User user,
                                                     @RequestParam(defaultValue = "en") String locale) {
        return documentationService.listCategories(user, locale);
    }

    @GetMapping("/articles")
    public List<DocumentationArticleDTO> publishedArticles(@CurrentUser User user,
                                                            @RequestParam(required = false) String query,
                                                            @RequestParam(defaultValue = "en") String locale) {
        return documentationService.listPublished(user, query, locale);
    }

    @GetMapping("/articles/{slug}")
    public DocumentationArticleDTO publishedArticle(@PathVariable String slug, @CurrentUser User user,
                                                    @RequestParam(defaultValue = "en") String locale) {
        return documentationService.getPublishedBySlug(slug, user, locale);
    }

    @GetMapping("/admin/categories")
    public List<DocumentationCategoryDTO> adminCategories(@CurrentUser User user,
                                                           @RequestParam(defaultValue = "en") String locale) {
        return documentationService.listAdminCategories(user, locale);
    }

    @PostMapping("/admin/categories")
    public ResponseEntity<DocumentationCategoryDTO> createCategory(
            @Valid @RequestBody DocumentationCategoryRequest request, @CurrentUser User user) {
        DocumentationCategoryDTO created = documentationService.createCategory(request, user);
        return ResponseEntity.status(201).body(created);
    }

    @PutMapping("/admin/categories/{id}")
    public DocumentationCategoryDTO updateCategory(@PathVariable Long id,
                                                   @Valid @RequestBody DocumentationCategoryRequest request,
                                                   @CurrentUser User user) {
        return documentationService.updateCategory(id, request, user);
    }

    @PostMapping("/admin/categories/{id}/archive")
    public ResponseEntity<Void> archiveCategory(@PathVariable Long id, @CurrentUser User user) {
        documentationService.archiveCategory(id, user);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/admin/categories/{id}/restore")
    public DocumentationCategoryDTO restoreCategory(@PathVariable Long id, @CurrentUser User user) {
        return documentationService.restoreCategory(id, user);
    }

    @GetMapping("/admin/articles")
    public List<DocumentationArticleDTO> adminArticles(@CurrentUser User user,
                                                       @RequestParam(defaultValue = "en") String locale) {
        return documentationService.listAdminArticles(user, locale);
    }

    @PostMapping("/admin/articles")
    public ResponseEntity<DocumentationArticleDTO> createArticle(
            @Valid @RequestBody DocumentationArticleRequest request, @CurrentUser User user) {
        DocumentationArticleDTO created = documentationService.createArticle(request, user);
        return ResponseEntity.status(201).body(created);
    }

    @PutMapping("/admin/articles/{id}")
    public DocumentationArticleDTO updateArticle(@PathVariable Long id,
                                                 @Valid @RequestBody DocumentationArticleRequest request,
                                                 @CurrentUser User user) {
        return documentationService.updateArticle(id, request, user);
    }

    @PostMapping("/admin/articles/{id}/publish")
    public DocumentationArticleDTO publishArticle(@PathVariable Long id, @CurrentUser User user) {
        return documentationService.publishArticle(id, user);
    }

    @PostMapping("/admin/articles/{id}/archive")
    public DocumentationArticleDTO archiveArticle(@PathVariable Long id, @CurrentUser User user) {
        return documentationService.archiveArticle(id, user);
    }

    @PostMapping("/admin/articles/{id}/restore")
    public DocumentationArticleDTO restoreArticle(@PathVariable Long id, @CurrentUser User user) {
        return documentationService.restoreArticle(id, user);
    }

    @PostMapping(value = "/admin/assets", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentationAssetDTO> uploadAsset(@RequestParam("file") MultipartFile file,
                                                              @CurrentUser User user) {
        return ResponseEntity.status(201).body(documentationService.uploadAsset(file, user));
    }

    @GetMapping("/assets/{assetId}")
    public ResponseEntity<byte[]> asset(@PathVariable String assetId, @CurrentUser User user) {
        DocumentationAsset asset = documentationService.getReadableAsset(assetId, user);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(asset.getContentType()))
                .header("X-Content-Type-Options", "nosniff")
                .cacheControl(CacheControl.noStore().cachePrivate())
                .body(documentationService.downloadAsset(asset));
    }
}
