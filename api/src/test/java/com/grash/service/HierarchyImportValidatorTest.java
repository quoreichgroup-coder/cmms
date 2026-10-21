package com.grash.service;

import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HierarchyImportValidatorTest {

    private static final class TreeNode {
        private final Long id;
        private TreeNode parent;

        private TreeNode(Long id) {
            this.id = id;
        }
    }

    private record Node(Long id, String name, String parentName) {
    }

    private record ExchangeNode(UUID exchangeId, UUID parentExchangeId) {
    }

    private void validate(List<Node> rows, List<Node> existing) {
        HierarchyImportValidator.validate(
                rows,
                Node::name,
                Node::parentName,
                Node::id,
                parentName -> existing.stream()
                        .filter(node -> node.name().equalsIgnoreCase(parentName))
                        .toList(),
                Node::id,
                "equipment");
    }

    @Test
    void acceptsOutOfOrderBatchHierarchyAndExistingParent() {
        assertDoesNotThrow(() -> validate(
                Arrays.asList(
                        new Node(null, "Pump 01", "Area A"),
                        new Node(null, "Area A", null)),
                Collections.emptyList()));

        assertDoesNotThrow(() -> validate(
                Collections.singletonList(new Node(null, "Pump 01", "Plant A")),
                Collections.singletonList(new Node(7L, "Plant A", null))));
    }

    @Test
    void rejectsMissingAndAmbiguousExternalParents() {
        IllegalArgumentException missing = assertThrows(IllegalArgumentException.class,
                () -> validate(Collections.singletonList(new Node(null, "Pump 01", "Missing")),
                        Collections.emptyList()));
        assertTrue(missing.getMessage().contains("row 2"));
        assertTrue(missing.getMessage().contains("not found"));

        IllegalArgumentException ambiguous = assertThrows(IllegalArgumentException.class,
                () -> validate(Collections.singletonList(new Node(null, "Pump 01", "Area A")),
                        Arrays.asList(new Node(1L, "Area A", null), new Node(2L, "area a", null))));
        assertTrue(ambiguous.getMessage().contains("ambiguous"));
    }

    @Test
    void rejectsAmbiguousBatchParentsAndCaseMismatches() {
        IllegalArgumentException ambiguous = assertThrows(IllegalArgumentException.class,
                () -> validate(Arrays.asList(
                        new Node(null, "Area A", null),
                        new Node(null, "area a", null),
                        new Node(null, "Pump 01", "Area A")), Collections.emptyList()));
        assertTrue(ambiguous.getMessage().contains("ambiguous"));

        IllegalArgumentException caseMismatch = assertThrows(IllegalArgumentException.class,
                () -> validate(Arrays.asList(
                        new Node(null, "Area A", null),
                        new Node(null, "Pump 01", "area a")), Collections.emptyList()));
        assertTrue(caseMismatch.getMessage().contains("case"));
    }

    @Test
    void rejectsSelfParentingAndBatchCycles() {
        IllegalArgumentException self = assertThrows(IllegalArgumentException.class,
                () -> validate(Collections.singletonList(new Node(3L, "Pump 01", "Pump 01")),
                        Collections.emptyList()));
        assertTrue(self.getMessage().contains("cycle"));

        IllegalArgumentException cycle = assertThrows(IllegalArgumentException.class,
                () -> validate(Arrays.asList(
                        new Node(null, "A", "B"),
                        new Node(null, "B", "A")), Collections.emptyList()));
        assertTrue(cycle.getMessage().contains("cycle"));
    }

    @Test
    void rejectsAnExistingParentThatIsTheUpdatedRow() {
        IllegalArgumentException self = assertThrows(IllegalArgumentException.class,
                () -> validate(Collections.singletonList(new Node(3L, "Pump 01", "Old name")),
                        Collections.singletonList(new Node(3L, "Old name", null))));
        assertTrue(self.getMessage().contains("own parent"));
    }

    @Test
    void rejectsCyclesThatWouldBeCreatedThroughAnExistingParentChain() {
        TreeNode asset = new TreeNode(1L);
        TreeNode child = new TreeNode(2L);
        child.parent = asset;

        IllegalArgumentException cycle = assertThrows(IllegalArgumentException.class,
                () -> HierarchyImportValidator.assertNoExistingCycle(
                        asset, child, node -> node.id, node -> node.parent, "asset"));
        assertTrue(cycle.getMessage().contains("would create a cycle"));

        TreeNode first = new TreeNode(3L);
        TreeNode second = new TreeNode(4L);
        first.parent = second;
        second.parent = first;
        IllegalArgumentException corruptChain = assertThrows(IllegalArgumentException.class,
                () -> HierarchyImportValidator.assertNoExistingCycle(
                        new TreeNode(5L), first, node -> node.id, node -> node.parent, "asset"));
        assertTrue(corruptChain.getMessage().contains("existing parent chain"));
    }

    @Test
    void validatesStableExchangeKeysAndResolvesParents() {
        UUID parentId = UUID.randomUUID();
        UUID childId = UUID.randomUUID();
        List<ExchangeNode> rows = Arrays.asList(
                new ExchangeNode(childId, parentId), new ExchangeNode(parentId, null));
        assertDoesNotThrow(() -> HierarchyImportValidator.validateExchangeReferences(
                rows, ExchangeNode::exchangeId, ExchangeNode::parentExchangeId, ignored -> null, "asset"));

        IllegalArgumentException missing = assertThrows(IllegalArgumentException.class,
                () -> HierarchyImportValidator.validateExchangeReferences(
                        Collections.singletonList(new ExchangeNode(childId, parentId)),
                        ExchangeNode::exchangeId, ExchangeNode::parentExchangeId, ignored -> null, "asset"));
        assertTrue(missing.getMessage().contains("not found"));

        IllegalArgumentException duplicate = assertThrows(IllegalArgumentException.class,
                () -> HierarchyImportValidator.validateExchangeReferences(
                        Arrays.asList(new ExchangeNode(parentId, null), new ExchangeNode(parentId, null)),
                        ExchangeNode::exchangeId, ExchangeNode::parentExchangeId, ignored -> null, "asset"));
        assertTrue(duplicate.getMessage().contains("duplicated"));
    }

    @Test
    void rejectsCyclesInStableExchangeReferences() {
        UUID first = UUID.randomUUID();
        UUID second = UUID.randomUUID();
        IllegalArgumentException cycle = assertThrows(IllegalArgumentException.class,
                () -> HierarchyImportValidator.validateExchangeReferences(
                        Arrays.asList(new ExchangeNode(first, second), new ExchangeNode(second, first)),
                        ExchangeNode::exchangeId, ExchangeNode::parentExchangeId, ignored -> null, "asset"));
        assertTrue(cycle.getMessage().contains("cycle"));
    }
}
