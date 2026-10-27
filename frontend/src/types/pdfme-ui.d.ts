import type { Template } from './pdfme-common';

export class Designer {
  constructor(args: {
    domContainer: HTMLDivElement;
    template: Template;
    plugins: Record<string, any>;
    options?: Record<string, any>;
  });
  onChangeTemplate(callback: (template: Template) => void): void;
  onSaveTemplate(callback: (template: Template) => void): void;
  onChangeSelection(callback: (selection: { pageIndex: number; schemas: Array<{ name: string; pageIndex: number; schemaIndex: number; schema: any; type: string }> }) => void): void;
  onPageChange(callback: (page: { currentPage: number; totalPages: number }) => void): void;
  getPageCursor(): number;
  getTotalPages(): number;
  updateTemplate(template: Template, options?: { page?: number }): void;
  selectSchemas(targets: Array<{ name: string; pageIndex: number; schemaIndex: number }>, options?: { pageIndex?: number; scroll?: boolean }): void;
  saveTemplate(): void;
  destroy(): void;
}
