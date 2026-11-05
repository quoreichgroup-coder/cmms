package com.grash.model;

import com.grash.model.abstracts.CompanyAudit;
import com.grash.model.enums.DocumentationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.util.Date;

@Entity
@Table(name = "documentation_article",
        uniqueConstraints = @UniqueConstraint(name = "uk_documentation_article_company_slug",
                columnNames = {"company_id", "locale", "slug"}),
        indexes = {
                @Index(name = "idx_documentation_article_company_status_order",
                        columnList = "company_id, locale, status, display_order"),
                @Index(name = "idx_documentation_article_category", columnList = "category_id")
        })
@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class DocumentationArticle extends CompanyAudit {
    @Column(nullable = false, length = 8)
    private String locale = "en";

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_documentation_article_category"))
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private DocumentationCategory category;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(nullable = false, length = 180)
    private String slug;

    @Column(nullable = false, length = 800)
    private String summary;

    @Column(nullable = false, columnDefinition = "text")
    private String content;

    @Column(columnDefinition = "text")
    private String keywords;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "required_permission", length = 60)
    private String requiredPermission;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DocumentationStatus status = DocumentationStatus.DRAFT;

    @Column(name = "published_at")
    private Date publishedAt;

    @Column(name = "published_title", length = 180)
    private String publishedTitle;

    @Column(name = "published_slug", length = 180)
    private String publishedSlug;

    @Column(name = "published_summary", length = 800)
    private String publishedSummary;

    @Column(name = "published_content", columnDefinition = "text")
    private String publishedContent;

    @Column(name = "published_keywords", columnDefinition = "text")
    private String publishedKeywords;
}
