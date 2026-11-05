package com.grash.service;

import com.grash.dto.DocumentationArticleDTO;
import com.grash.dto.DocumentationArticleRequest;
import com.grash.dto.DocumentationCategoryDTO;
import com.grash.dto.DocumentationCategoryRequest;
import com.grash.dto.DocumentationAssetDTO;
import com.grash.exception.CustomException;
import com.grash.factory.StorageServiceFactory;
import com.grash.model.DocumentationArticle;
import com.grash.model.DocumentationAsset;
import com.grash.model.DocumentationCategory;
import com.grash.model.User;
import com.grash.model.enums.DocumentationStatus;
import com.grash.model.enums.PermissionEntity;
import com.grash.repository.DocumentationArticleRepository;
import com.grash.repository.DocumentationAssetRepository;
import com.grash.repository.DocumentationCategoryRepository;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class DocumentationService {
    private static final String ASSET_SCHEME = "qpm-help-asset:";
    private static final Safelist ARTICLE_HTML = Safelist.relaxed()
            .addTags("h1", "h2", "h3", "h4", "table", "thead", "tbody", "tr", "th", "td", "pre", "code")
            .addAttributes("img", "src", "alt", "title", "width", "height")
            .addProtocols("img", "src", ASSET_SCHEME.substring(0, ASSET_SCHEME.length() - 1))
            .addProtocols("a", "href", "https", "http", "mailto");

    private final DocumentationCategoryRepository categoryRepository;
    private final DocumentationArticleRepository articleRepository;
    private final DocumentationAssetRepository assetRepository;
    private final StorageServiceFactory storageServiceFactory;

    public DocumentationService(DocumentationCategoryRepository categoryRepository,
                                DocumentationArticleRepository articleRepository,
                                DocumentationAssetRepository assetRepository,
                                StorageServiceFactory storageServiceFactory) {
        this.categoryRepository = categoryRepository;
        this.articleRepository = articleRepository;
        this.assetRepository = assetRepository;
        this.storageServiceFactory = storageServiceFactory;
    }

    @Transactional(readOnly = true)
    public List<DocumentationCategoryDTO> listCategories(User user, String requestedLocale) {
        requireCompany(user);
        String locale = resolveLocale(requestedLocale);
        return categoryRepository.findByCompany_IdAndLocaleAndActiveTrueOrderByDisplayOrderAscTitleAsc(user.getCompany().getId(), locale)
                .stream().filter(category -> canView(user, category.getRequiredPermission()))
                .map(category -> DocumentationCategoryDTO.from(category,
                        articleRepository.findByCompany_IdAndLocaleAndStatusOrderByDisplayOrderAscUpdatedAtDesc(
                                        user.getCompany().getId(), locale, DocumentationStatus.PUBLISHED)
                                .stream().filter(article -> article.getCategory().getId().equals(category.getId()))
                                .filter(article -> canView(user, article.getRequiredPermission())).count()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DocumentationArticleDTO> listPublished(User user, String query, String requestedLocale) {
        requireCompany(user);
        String locale = resolveLocale(requestedLocale);
        String normalizedQuery = normalize(query);
        return articleRepository.findByCompany_IdAndLocaleAndStatusOrderByDisplayOrderAscUpdatedAtDesc(
                        user.getCompany().getId(), locale, DocumentationStatus.PUBLISHED)
                .stream()
                .filter(article -> article.getCategory().isActive())
                .filter(article -> canView(user, article.getCategory().getRequiredPermission()))
                .filter(article -> canView(user, article.getRequiredPermission()))
                .filter(article -> normalizedQuery.isBlank() || searchableText(article).contains(normalizedQuery))
                .map(DocumentationArticleDTO::published)
                .toList();
    }

    @Transactional(readOnly = true)
    public DocumentationArticleDTO getPublishedBySlug(String slug, User user, String requestedLocale) {
        requireCompany(user);
        String locale = resolveLocale(requestedLocale);
        DocumentationArticle article = articleRepository
                .findByCompany_IdAndLocaleAndPublishedSlugAndStatus(user.getCompany().getId(), locale, slug,
                        DocumentationStatus.PUBLISHED)
                .filter(value -> value.getCategory().isActive())
                .filter(value -> canView(user, value.getCategory().getRequiredPermission()))
                .filter(value -> canView(user, value.getRequiredPermission()))
                .orElseThrow(() -> new CustomException("Documentation article not found", HttpStatus.NOT_FOUND));
        return DocumentationArticleDTO.published(article);
    }

    @Transactional(readOnly = true)
    public List<DocumentationCategoryDTO> listAdminCategories(User user, String requestedLocale) {
        requireManage(user);
        String locale = resolveLocale(requestedLocale);
        return categoryRepository.findByCompany_IdAndLocaleOrderByDisplayOrderAscTitleAsc(user.getCompany().getId(), locale)
                .stream().map(category -> DocumentationCategoryDTO.from(category,
                        articleRepository.countByCategory_Id(category.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DocumentationArticleDTO> listAdminArticles(User user, String requestedLocale) {
        requireManage(user);
        String locale = resolveLocale(requestedLocale);
        return articleRepository.findByCompany_IdAndLocaleOrderByDisplayOrderAscUpdatedAtDesc(user.getCompany().getId(), locale)
                .stream().map(DocumentationArticleDTO::admin).toList();
    }

    @Transactional
    public DocumentationCategoryDTO createCategory(DocumentationCategoryRequest request, User user) {
        requireManage(user);
        DocumentationCategory category = new DocumentationCategory();
        applyCategory(category, request, user, true);
        return DocumentationCategoryDTO.from(categoryRepository.save(category), 0);
    }

    @Transactional
    public DocumentationCategoryDTO updateCategory(Long id, DocumentationCategoryRequest request, User user) {
        requireManage(user);
        DocumentationCategory category = findCategory(id, user);
        if (!category.getLocale().equals(resolveLocale(request.locale())))
            throw new CustomException("Category locale cannot be changed", HttpStatus.BAD_REQUEST);
        applyCategory(category, request, user, false);
        return DocumentationCategoryDTO.from(categoryRepository.save(category),
                articleRepository.countByCategory_Id(category.getId()));
    }

    @Transactional
    public void archiveCategory(Long id, User user) {
        requireManage(user);
        DocumentationCategory category = findCategory(id, user);
        category.setActive(false);
        categoryRepository.save(category);
    }

    @Transactional
    public DocumentationCategoryDTO restoreCategory(Long id, User user) {
        requireManage(user);
        DocumentationCategory category = findCategory(id, user);
        category.setActive(true);
        return DocumentationCategoryDTO.from(categoryRepository.save(category),
                articleRepository.countByCategory_Id(category.getId()));
    }

    @Transactional
    public DocumentationArticleDTO createArticle(DocumentationArticleRequest request, User user) {
        requireManage(user);
        DocumentationArticle article = new DocumentationArticle();
        applyArticle(article, request, user, true);
        article.setStatus(DocumentationStatus.DRAFT);
        return DocumentationArticleDTO.admin(articleRepository.save(article));
    }

    @Transactional
    public DocumentationArticleDTO updateArticle(Long id, DocumentationArticleRequest request, User user) {
        requireManage(user);
        DocumentationArticle article = findArticle(id, user);
        if (article.getStatus() == DocumentationStatus.ARCHIVED)
            throw new CustomException("Archived articles cannot be edited", HttpStatus.CONFLICT);
        if (!article.getLocale().equals(resolveLocale(request.locale())))
            throw new CustomException("Article locale cannot be changed", HttpStatus.BAD_REQUEST);
        applyArticle(article, request, user, false);
        return DocumentationArticleDTO.admin(articleRepository.save(article));
    }

    @Transactional
    public DocumentationArticleDTO publishArticle(Long id, User user) {
        requireManage(user);
        DocumentationArticle article = findArticle(id, user);
        if (article.getStatus() == DocumentationStatus.ARCHIVED)
            throw new CustomException("Archived articles cannot be published", HttpStatus.CONFLICT);
        if (!article.getCategory().isActive())
            throw new CustomException("Activate the category before publishing this article", HttpStatus.CONFLICT);
        if (article.getTitle() == null || article.getSummary() == null || article.getContent() == null)
            throw new CustomException("A complete draft is required before publishing", HttpStatus.BAD_REQUEST);
        ensurePublishedSlugAvailable(article.getSlug(), user, article.getLocale(), article.getId());
        article.setPublishedTitle(article.getTitle());
        article.setPublishedSlug(article.getSlug());
        article.setPublishedSummary(article.getSummary());
        article.setPublishedContent(article.getContent());
        article.setPublishedKeywords(article.getKeywords());
        article.setPublishedAt(new Date());
        article.setStatus(DocumentationStatus.PUBLISHED);
        return DocumentationArticleDTO.admin(articleRepository.save(article));
    }

    @Transactional
    public DocumentationArticleDTO archiveArticle(Long id, User user) {
        requireManage(user);
        DocumentationArticle article = findArticle(id, user);
        article.setStatus(DocumentationStatus.ARCHIVED);
        return DocumentationArticleDTO.admin(articleRepository.save(article));
    }

    @Transactional
    public DocumentationArticleDTO restoreArticle(Long id, User user) {
        requireManage(user);
        DocumentationArticle article = findArticle(id, user);
        if (article.getStatus() != DocumentationStatus.ARCHIVED)
            throw new CustomException("Only archived articles can be restored", HttpStatus.CONFLICT);
        article.setStatus(DocumentationStatus.DRAFT);
        return DocumentationArticleDTO.admin(articleRepository.save(article));
    }

    @Transactional
    public DocumentationAssetDTO uploadAsset(MultipartFile file, User user) {
        requireManage(user);
        if (file == null || file.isEmpty() || file.getSize() > 10L * 1024 * 1024)
            throw new CustomException("Image must be between 1 byte and 10 MB", HttpStatus.BAD_REQUEST);
        String contentType = detectImageType(file);
        String publicId = UUID.randomUUID().toString();
        String objectPath = storageServiceFactory.getStorageService().upload(
                file, "company " + user.getCompany().getId() + "/help-center");
        DocumentationAsset asset = new DocumentationAsset();
        asset.setPublicId(publicId);
        asset.setName(safeFileName(file.getOriginalFilename()));
        asset.setStoragePath(objectPath);
        asset.setContentType(contentType);
        assetRepository.save(asset);
        return new DocumentationAssetDTO(publicId, contentType, asset.getName());
    }

    @Transactional(readOnly = true)
    public DocumentationAsset getReadableAsset(String publicId, User user) {
        requireCompany(user);
        DocumentationAsset asset = assetRepository.findByPublicId(publicId)
                .filter(value -> value.getCompany().getId().equals(user.getCompany().getId()))
                .orElseThrow(() -> new CustomException("Documentation image not found", HttpStatus.NOT_FOUND));
        if (canManage(user)) return asset;

        String reference = ASSET_SCHEME + publicId;
        boolean referencedByReadableArticle = articleRepository
                .findByCompany_IdAndStatusAndPublishedContentContaining(
                        user.getCompany().getId(), DocumentationStatus.PUBLISHED, reference)
                .stream()
                .anyMatch(article -> article.getCategory().isActive()
                        && canView(user, article.getCategory().getRequiredPermission())
                        && canView(user, article.getRequiredPermission()));
        if (!referencedByReadableArticle)
            throw new CustomException("Documentation image not found", HttpStatus.NOT_FOUND);
        return asset;
    }

    public byte[] downloadAsset(DocumentationAsset asset) {
        return storageServiceFactory.getStorageService().download(asset.getStoragePath());
    }

    private void applyCategory(DocumentationCategory category, DocumentationCategoryRequest request,
                               User user, boolean creating) {
        String locale = resolveLocale(request.locale());
        String title = request.title().trim();
        if (title.isBlank()) throw new CustomException("Category title is required", HttpStatus.BAD_REQUEST);
        String slug = slug(request.slug() == null || request.slug().isBlank() ? title : request.slug());
        categoryRepository.findByCompany_IdAndLocaleAndSlug(user.getCompany().getId(), locale, slug)
                .filter(existing -> !existing.getId().equals(category.getId()))
                .ifPresent(existing -> { throw new CustomException("Category slug already exists", HttpStatus.CONFLICT); });
        category.setTitle(title);
        category.setLocale(locale);
        category.setSlug(slug);
        category.setDescription(trimToNull(request.description()));
        category.setIcon(trimToNull(request.icon()));
        category.setDisplayOrder(request.displayOrder() == null ? 0 : Math.max(0, request.displayOrder()));
        category.setRequiredPermission(permissionName(request.requiredPermission()));
        if (request.active() != null || creating) category.setActive(request.active() == null || request.active());
    }

    private void applyArticle(DocumentationArticle article, DocumentationArticleRequest request,
                              User user, boolean creating) {
        String locale = resolveLocale(request.locale());
        DocumentationCategory category = findCategory(request.categoryId(), user);
        if (!category.getLocale().equals(locale))
            throw new CustomException("Article and category locales must match", HttpStatus.BAD_REQUEST);
        String title = request.title().trim();
        String slug = slug(request.slug() == null || request.slug().isBlank() ? title : request.slug());
        ensureDraftSlugAvailable(slug, user, locale, article.getId());
        article.setCategory(category);
        article.setLocale(locale);
        article.setTitle(title);
        article.setSlug(slug);
        article.setSummary(request.summary().trim());
        article.setContent(sanitizeArticleContent(request.content(), user));
        article.setKeywords(normalizeKeywords(request.keywords()));
        article.setDisplayOrder(request.displayOrder() == null ? 0 : Math.max(0, request.displayOrder()));
        article.setRequiredPermission(permissionName(request.requiredPermission()));
        if (creating) article.setStatus(DocumentationStatus.DRAFT);
    }

    private String sanitizeArticleContent(String html, User user) {
        org.jsoup.nodes.Document document = Jsoup.parseBodyFragment(html);
        for (org.jsoup.nodes.Element image : document.select("img")) {
            String source = image.attr("src");
            if (!source.startsWith(ASSET_SCHEME)) {
                throw new CustomException("Use the Help Center image uploader for article images", HttpStatus.BAD_REQUEST);
            }
            String publicId = source.substring(ASSET_SCHEME.length());
            DocumentationAsset asset = assetRepository.findByPublicId(publicId)
                    .orElseThrow(() -> new CustomException("Documentation image not found", HttpStatus.BAD_REQUEST));
            if (!asset.getCompany().getId().equals(user.getCompany().getId()))
                throw new CustomException("Documentation image belongs to another organization", HttpStatus.FORBIDDEN);
            image.attr("src", ASSET_SCHEME + publicId);
        }
        return Jsoup.clean(document.body().html(), "", ARTICLE_HTML, new org.jsoup.nodes.Document.OutputSettings().prettyPrint(false));
    }

    private void ensureDraftSlugAvailable(String slug, User user, String locale, Long currentId) {
        articleRepository.findByCompany_IdAndLocaleAndSlug(user.getCompany().getId(), locale, slug)
                .filter(existing -> !existing.getId().equals(currentId))
                .ifPresent(existing -> { throw new CustomException("Article slug already exists", HttpStatus.CONFLICT); });
    }

    private void ensurePublishedSlugAvailable(String slug, User user, String locale, Long currentId) {
        articleRepository.findByCompany_IdAndLocaleAndPublishedSlugAndStatus(user.getCompany().getId(), locale, slug,
                        DocumentationStatus.PUBLISHED)
                .filter(existing -> !existing.getId().equals(currentId))
                .ifPresent(existing -> { throw new CustomException("Published article slug already exists", HttpStatus.CONFLICT); });
    }

    private DocumentationCategory findCategory(Long id, User user) {
        return categoryRepository.findByIdAndCompany_Id(id, user.getCompany().getId())
                .orElseThrow(() -> new CustomException("Documentation category not found", HttpStatus.NOT_FOUND));
    }

    private DocumentationArticle findArticle(Long id, User user) {
        return articleRepository.findByIdAndCompany_Id(id, user.getCompany().getId())
                .orElseThrow(() -> new CustomException("Documentation article not found", HttpStatus.NOT_FOUND));
    }

    private void requireCompany(User user) {
        if (user == null || user.getCompany() == null)
            throw new CustomException("A company account is required", HttpStatus.FORBIDDEN);
    }

    private void requireManage(User user) {
        requireCompany(user);
        if (!canManage(user))
            throw new CustomException("Documentation management requires settings edit permission", HttpStatus.FORBIDDEN);
    }

    private boolean canManage(User user) {
        boolean canManageSettings = user.getRole() != null
                && user.getRole().getViewPermissions().contains(PermissionEntity.SETTINGS)
                && user.getRole().getEditOtherPermissions().contains(PermissionEntity.SETTINGS);
        return user.isOwnsCompany() || canManageSettings;
    }

    private boolean canView(User user, String requiredPermission) {
        if (requiredPermission == null || requiredPermission.isBlank() || user.isOwnsCompany()) return true;
        try {
            return user.getRole() != null && user.getRole().getViewPermissions()
                    .contains(PermissionEntity.valueOf(requiredPermission));
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private String permissionName(String value) {
        String permission = trimToNull(value);
        if (permission == null) return null;
        try {
            return PermissionEntity.valueOf(permission).name();
        } catch (IllegalArgumentException exception) {
            throw new CustomException("Unknown QPM module permission", HttpStatus.BAD_REQUEST);
        }
    }

    private String resolveLocale(String locale) {
        if (locale == null) return "en";
        String normalized = locale.trim().toLowerCase(Locale.ROOT).replace('_', '-');
        return normalized.equals("fr") || normalized.startsWith("fr-") ? "fr" : "en";
    }

    private String normalizeKeywords(List<String> keywords) {
        if (keywords == null) return null;
        return keywords.stream().filter(value -> value != null && !value.isBlank())
                .map(String::trim).distinct().limit(30).reduce((first, second) -> first + "\n" + second).orElse(null);
    }

    private String searchableText(DocumentationArticle article) {
        return normalize(article.getPublishedTitle() + " " + article.getPublishedSummary() + " "
                + article.getPublishedContent() + " " + article.getPublishedKeywords());
    }

    private String normalize(String value) {
        if (value == null) return "";
        return Normalizer.normalize(value, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT).replaceAll("<[^>]*>", " ").replaceAll("\\s+", " ").trim();
    }

    private String slug(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
        if (normalized.isBlank()) throw new CustomException("A valid slug is required", HttpStatus.BAD_REQUEST);
        return normalized.substring(0, Math.min(180, normalized.length()));
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String safeFileName(String value) {
        if (value == null || value.isBlank()) return "help-image";
        String name = value.replaceAll("[\\\\/\\r\\n\\t]", "_").trim();
        return name.substring(0, Math.min(name.length(), 255));
    }

    private String detectImageType(MultipartFile file) {
        try {
            byte[] header = file.getInputStream().readNBytes(12);
            if (header.length >= 8 && (header[0] & 0xff) == 0x89 && header[1] == 0x50
                    && header[2] == 0x4e && header[3] == 0x47) return "image/png";
            if (header.length >= 3 && (header[0] & 0xff) == 0xff && (header[1] & 0xff) == 0xd8
                    && (header[2] & 0xff) == 0xff) return "image/jpeg";
            if (header.length >= 12 && header[0] == 'R' && header[1] == 'I' && header[2] == 'F'
                    && header[3] == 'F' && header[8] == 'W' && header[9] == 'E'
                    && header[10] == 'B' && header[11] == 'P') return "image/webp";
            throw new CustomException("Only PNG, JPEG, and WebP images are supported", HttpStatus.BAD_REQUEST);
        } catch (IOException exception) {
            throw new CustomException("Unable to read uploaded image", HttpStatus.BAD_REQUEST);
        }
    }
}
