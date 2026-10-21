export interface HierarchyImportReference {
  name: unknown;
  parentName: unknown;
  exchangeId?: unknown;
  parentExchangeId?: unknown;
}

export interface HierarchyImportIssue {
  row: number;
  type:
    | 'ambiguous-parent'
    | 'parent-name-mismatch'
    | 'duplicate-exchange-id'
    | 'invalid-exchange-id'
    | 'cycle';
}

const normalize = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';
const normalizeKey = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value).trim().toLowerCase();
const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/**
 * Finds hierarchy references that are unsafe to resolve from rows in the same
 * import file. Existing database parents remain valid and are resolved by the
 * backend; this check only blocks ambiguities and cycles provable in the file.
 */
export const findHierarchyImportIssues = (
  rows: HierarchyImportReference[]
): HierarchyImportIssue[] => {
  const issues: HierarchyImportIssue[] = [];
  const rowsByName = new Map<string, number[]>();
  const rowsByExchangeId = new Map<string, number[]>();
  rows.forEach(({ name, exchangeId }, index) => {
    const normalizedName = normalize(name);
    if (normalizedName) {
      rowsByName.set(normalizedName, [
        ...(rowsByName.get(normalizedName) ?? []),
        index
      ]);
    }
    const key = normalizeKey(exchangeId);
    if (!key) return;
    if (!isUuid(key)) {
      issues.push({ row: index, type: 'invalid-exchange-id' });
      return;
    }
    rowsByExchangeId.set(key, [...(rowsByExchangeId.get(key) ?? []), index]);
  });

  rowsByExchangeId.forEach((indexes) => {
    indexes.slice(1).forEach((row) => issues.push({ row, type: 'duplicate-exchange-id' }));
  });
  const parentByRow = new Map<number, number>();
  rows.forEach(({ parentName, parentExchangeId }, index) => {
    const parentKey = normalizeKey(parentExchangeId);
    if (parentKey) {
      if (!isUuid(parentKey)) {
        issues.push({ row: index, type: 'invalid-exchange-id' });
        return;
      }
      const candidates = rowsByExchangeId.get(parentKey) ?? [];
      if (candidates.length === 1) parentByRow.set(index, candidates[0]);
      return;
    }
    const normalizedParent = normalize(parentName);
    if (!normalizedParent) return;

    const candidates = rowsByName.get(normalizedParent) ?? [];
    if (candidates.length > 1) {
      issues.push({ row: index, type: 'ambiguous-parent' });
    } else if (candidates.length === 1) {
      const candidate = candidates[0];
      const declaredParent = String(parentName);
      const candidateName = String(rows[candidate].name);
      if (declaredParent !== candidateName) {
        // The current API's batch resolver is case-sensitive, so accepting
        // this would silently turn an in-file child into a root node.
        issues.push({ row: index, type: 'parent-name-mismatch' });
      } else {
        parentByRow.set(index, candidate);
      }
    }
  });

  const completed = new Set<number>();
  rows.forEach((_, start) => {
    if (completed.has(start)) return;

    const path: number[] = [];
    const pathIndexes = new Map<number, number>();
    let current: number | undefined = start;
    while (current !== undefined && !completed.has(current)) {
      const cycleStart = pathIndexes.get(current);
      if (cycleStart !== undefined) {
        path.slice(cycleStart).forEach((row) => {
          issues.push({ row, type: 'cycle' });
        });
        break;
      }

      pathIndexes.set(current, path.length);
      path.push(current);
      current = parentByRow.get(current);
    }

    path.forEach((row) => completed.add(row));
  });

  return issues;
};
