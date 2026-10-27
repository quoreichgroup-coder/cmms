/** Narrow compile-time boundary for pdfme 6.2.x on QPM's TypeScript 4.7. */
export const PDFME_VERSION: string;
export type Template = {
  pdfmeVersion: string;
  basePdf: { width: number; height: number; padding: number[] } | Record<string, any>;
  schemas: Array<Array<Record<string, any>>>;
  [key: string]: any;
};
