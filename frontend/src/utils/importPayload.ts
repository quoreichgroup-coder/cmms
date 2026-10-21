export interface ImportPayloadColumn {
  keyName: string;
  formatter?: (value: any) => any;
}

export interface ImportPayloadMapping {
  keyName: string;
  userHeader: string;
}

/**
 * Build only fields supported by the selected import entity. Export-only
 * columns such as readable hierarchy paths therefore stay out of API writes.
 */
export const buildImportPayload = (
  rows: Record<string, any>[],
  columns: ImportPayloadColumn[],
  mappings: ImportPayloadMapping[]
): Record<string, any>[] =>
  rows.map((row) => {
    let result: Record<string, any> = {};
    columns.forEach(({ keyName, formatter }) => {
      const userHeader = mappings.find(
        (mapping) => mapping.keyName === keyName
      )?.userHeader;
      let value = userHeader === undefined ? undefined : row[userHeader];
      if (formatter) value = formatter(value);
      result = { ...result, [keyName]: value };
    });
    return result;
  });
