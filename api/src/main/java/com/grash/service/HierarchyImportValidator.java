package com.grash.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;

/** Validates parent references before a hierarchy import writes any records. */
final class HierarchyImportValidator {

    private HierarchyImportValidator() {
    }

    static <T, P> Map<String, P> validateExchangeReferences(
            List<T> rows,
            Function<T, UUID> getExchangeId,
            Function<T, UUID> getParentExchangeId,
            Function<UUID, P> findExistingByExchangeId,
            String entityLabel) {
        Map<UUID, List<Integer>> rowsByExchangeId = new HashMap<>();
        for (int i = 0; i < rows.size(); i++) {
            UUID exchangeId = getExchangeId.apply(rows.get(i));
            if (exchangeId != null) {
                rowsByExchangeId.computeIfAbsent(exchangeId, ignored -> new ArrayList<>()).add(i);
            }
        }
        for (Map.Entry<UUID, List<Integer>> entry : rowsByExchangeId.entrySet()) {
            if (entry.getValue().size() > 1) {
                throw invalid(entityLabel, entry.getValue().get(1), "exchange key is duplicated in the import file");
            }
        }

        Map<Integer, Integer> parentByRow = new HashMap<>();
        Map<String, P> resolvedExternalParents = new HashMap<>();
        for (int i = 0; i < rows.size(); i++) {
            UUID parentExchangeId = getParentExchangeId.apply(rows.get(i));
            if (parentExchangeId == null) {
                continue;
            }
            List<Integer> matches = rowsByExchangeId.getOrDefault(parentExchangeId, List.of());
            if (matches.size() > 1) {
                throw invalid(entityLabel, i, "parent exchange key is ambiguous in the import file");
            }
            if (matches.size() == 1) {
                parentByRow.put(i, matches.get(0));
                continue;
            }
            P existingParent = findExistingByExchangeId.apply(parentExchangeId);
            if (existingParent == null) {
                throw invalid(entityLabel, i, "parent exchange key was not found in this company");
            }
            resolvedExternalParents.put(parentExchangeId.toString(), existingParent);
        }
        validateAcyclic(rows.size(), parentByRow, entityLabel);
        return resolvedExternalParents;
    }

    static <T, P> Map<String, P> validate(
            List<T> rows,
            Function<T, String> getName,
            Function<T, String> getParentName,
            Function<T, Object> getId,
            Function<String, List<P>> findExistingByName,
            Function<P, Object> getExistingId,
            String entityLabel) {
        Map<String, List<Integer>> rowsByName = new HashMap<>();
        for (int i = 0; i < rows.size(); i++) {
            String normalizedName = normalize(getName.apply(rows.get(i)));
            if (!normalizedName.isEmpty()) {
                rowsByName.computeIfAbsent(normalizedName, ignored -> new ArrayList<>()).add(i);
            }
        }

        Map<Integer, Integer> parentByRow = new HashMap<>();
        Map<String, List<P>> existingParentsByNormalizedName = new HashMap<>();
        Map<String, P> resolvedExternalParents = new HashMap<>();
        for (int i = 0; i < rows.size(); i++) {
            T row = rows.get(i);
            String parentName = getParentName.apply(row);
            String normalizedParent = normalize(parentName);
            if (normalizedParent.isEmpty()) {
                continue;
            }

            List<Integer> batchMatches = rowsByName.getOrDefault(normalizedParent, List.of());
            if (batchMatches.size() > 1) {
                throw invalid(entityLabel, i, "parent name is ambiguous in the import file");
            }
            if (batchMatches.size() == 1) {
                int parentIndex = batchMatches.get(0);
                String batchParentName = getName.apply(rows.get(parentIndex));
                if (!Objects.equals(parentName, batchParentName)) {
                    throw invalid(entityLabel, i, "parent name differs in case from the import row");
                }
                parentByRow.put(i, parentIndex);
                continue;
            }

            List<P> existingMatches = existingParentsByNormalizedName.computeIfAbsent(
                    normalizedParent,
                    ignored -> findExistingByName.apply(parentName.trim()));
            if (existingMatches == null || existingMatches.isEmpty()) {
                throw invalid(entityLabel, i, "parent was not found in this company");
            }
            if (existingMatches.size() > 1) {
                throw invalid(entityLabel, i, "parent name is ambiguous in this company");
            }

            Object rowId = getId.apply(row);
            Object parentId = getExistingId.apply(existingMatches.get(0));
            if (rowId != null && rowId.equals(parentId)) {
                throw invalid(entityLabel, i, "an item cannot be its own parent");
            }
            resolvedExternalParents.put(parentName.trim(), existingMatches.get(0));
        }

        validateAcyclic(rows.size(), parentByRow, entityLabel);
        return resolvedExternalParents;
    }

    static <T> void assertNoExistingCycle(
            T child,
            T proposedParent,
            Function<T, Object> getId,
            Function<T, T> getParent,
            String entityLabel) {
        Object childId = getId.apply(child);
        Set<T> visitedObjects = Collections.newSetFromMap(new IdentityHashMap<>());
        Set<Object> visitedIds = new HashSet<>();
        T current = proposedParent;

        while (current != null) {
            Object currentId = getId.apply(current);
            if (current == child || (childId != null && childId.equals(currentId))) {
                throw new IllegalArgumentException("Invalid " + entityLabel + " hierarchy: parent assignment would create a cycle");
            }
            if (!visitedObjects.add(current) || (currentId != null && !visitedIds.add(currentId))) {
                throw new IllegalArgumentException("Invalid " + entityLabel + " hierarchy: an existing parent chain contains a cycle");
            }
            current = getParent.apply(current);
        }
    }

    private static void validateAcyclic(int size, Map<Integer, Integer> parentByRow, String entityLabel) {
        Set<Integer> completed = new HashSet<>();
        for (int start = 0; start < size; start++) {
            if (completed.contains(start)) {
                continue;
            }

            List<Integer> path = new ArrayList<>();
            Map<Integer, Integer> pathIndexes = new HashMap<>();
            Integer current = start;
            while (current != null && !completed.contains(current)) {
                Integer cycleStart = pathIndexes.get(current);
                if (cycleStart != null) {
                    int rowIndex = path.get(cycleStart);
                    throw invalid(entityLabel, rowIndex, "parent references contain a cycle");
                }
                pathIndexes.put(current, path.size());
                path.add(current);
                current = parentByRow.get(current);
            }
            completed.addAll(path);
        }
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(java.util.Locale.ROOT);
    }

    private static IllegalArgumentException invalid(String entityLabel, int rowIndex, String reason) {
        return new IllegalArgumentException(
                "Invalid " + entityLabel + " hierarchy at import row " + (rowIndex + 2) + ": " + reason);
    }
}
