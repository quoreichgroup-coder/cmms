import { read, utils } from 'xlsx';

export interface ParsedImportWorkbook {
  headers: string[];
  rows: Record<string, any>[];
  rowsAsArrays: any[][];
}

export const parseImportWorkbook = (data: Uint8Array): ParsedImportWorkbook => {
  const workbook = read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName || !workbook.Sheets[firstSheetName]) {
    throw new Error('The workbook does not contain a readable worksheet');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rowsAsArrays = utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  const headers = (rowsAsArrays[0] ?? []).filter(Boolean).map(String);
  if (
    headers.length === 0 ||
    headers.some((header) => /[\u0000-\u001f\u007f]/.test(header))
  ) {
    throw new Error('The worksheet does not contain a header row');
  }

  return {
    headers,
    rows: utils.sheet_to_json(sheet) as Record<string, any>[],
    rowsAsArrays
  };
};
