export type DocumentationStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface DocumentationCategory {
  id: number;
  locale: string;
  title: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  displayOrder: number;
  requiredPermission?: string | null;
  active: boolean;
  articleCount: number;
}

export interface DocumentationArticle {
  id: number;
  locale: string;
  categoryId: number;
  categoryTitle: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  keywords: string[];
  status: DocumentationStatus;
  requiredPermission?: string | null;
  displayOrder: number;
  updatedAt: string;
  publishedAt?: string | null;
  authorId?: number | null;
  hasDraftChanges: boolean;
}

export interface DocumentationCategoryRequest {
  locale: string;
  title: string;
  slug?: string;
  description?: string;
  icon?: string;
  displayOrder: number;
  requiredPermission?: string;
  active: boolean;
}

export interface DocumentationArticleRequest {
  locale: string;
  categoryId: number;
  title: string;
  slug?: string;
  summary: string;
  content: string;
  keywords: string[];
  displayOrder: number;
  requiredPermission?: string;
}

export interface DocumentationAsset {
  assetId: string;
  contentType: string;
  name: string;
}
