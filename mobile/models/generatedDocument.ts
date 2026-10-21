export interface GeneratedDocument {
  id: number;
  documentType: string;
  sourceType: string;
  sourceId: number;
  siteId: number | null;
  fileName: string;
  sha256: string;
  locale: string;
  templateVersion: string;
  issuedAt: string;
  issuedBy: number;
}
