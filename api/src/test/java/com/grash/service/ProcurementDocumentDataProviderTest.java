package com.grash.service;

import com.grash.exception.CustomException;
import com.grash.model.Part;
import com.grash.model.PartQuantity;
import com.grash.model.PurchaseOrder;
import com.grash.model.PurchaseRequisition;
import com.grash.model.PurchaseRequisitionLine;
import com.grash.model.Site;
import com.grash.model.User;
import com.grash.repository.PartQuantityRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProcurementDocumentDataProviderTest {
    private final ProcurementApprovalPrintService approvalPrintService = mock(ProcurementApprovalPrintService.class);
    private final DocumentContextResolver.DocumentContext context = new DocumentContextResolver.DocumentContext(
            "QPM", "QPM SA", null, null, "Abidjan", null, null, "XOF", null, "UTC",
            com.grash.model.enums.Language.FR, Locale.FRENCH, null, null);

    @Test
    void purchaseOrderPrintQueryFetchesLazyLineBindingsTogether() throws Exception {
        EntityGraph graph = PartQuantityRepository.class
                .getMethod("findDocumentLinesByPurchaseOrderId", Long.class)
                .getAnnotation(EntityGraph.class);
        assertNotNull(graph);
        assertArrayEquals(new String[]{"part", "site", "requisitionLine.requisition"}, graph.attributePaths());
        String query = PartQuantityRepository.class.getMethod("findDocumentLinesByPurchaseOrderId", Long.class)
                .getAnnotation(org.springframework.data.jpa.repository.Query.class).value();
        assertTrue(query.contains("order by line.id asc"));
    }

    @Test
    void purchaseOrderPrintUsesQuantityAndDescriptionWithoutInventingSupplierPrice() {
        PartQuantityRepository repository = mock(PartQuantityRepository.class);
        PurchaseOrderDocumentDataProvider provider = new PurchaseOrderDocumentDataProvider(repository, approvalPrintService);
        PurchaseOrder po = new PurchaseOrder(); po.setId(70L); po.setName("Commande pompe");
        Part part = new Part(); part.setName("Joint mécanique"); part.setDescription("Série 55"); part.setUnit("pcs"); part.setCost(987654.0);
        PartQuantity line = new PartQuantity(); line.setPart(part); line.setQuantity(3.0);
        when(repository.findDocumentLinesByPurchaseOrderId(70L)).thenReturn(List.of(line));

        var values = provider.resolve(po, context, Set.of("purchaseOrder.number", "purchaseOrder.lines", "company.legalName"));
        assertEquals("PO-70", values.get("purchaseOrder.number"));
        assertEquals("QPM SA", values.get("company.legalName"));
        var rows = (List<?>) values.get("purchaseOrder.lines");
        assertEquals(1, rows.size());
        var row = (java.util.Map<?, ?>) rows.get(0);
        assertEquals(3.0, row.get("quantity"));
        assertEquals("pcs", row.get("unit"));
        assertFalse(row.containsKey("price"));
        assertFalse(row.containsKey("total"));
        assertFalse(row.toString().contains("987654"));
        assertEquals("", row.get("unitPrice"));
        assertEquals("", row.get("lineTotal"));
        verify(repository).findDocumentLinesByPurchaseOrderId(70L);
    }

    @Test
    void purchaseOrderPrintIncludesExplicitSupplierUnitPriceAndLineTotal() {
        PartQuantityRepository repository = mock(PartQuantityRepository.class);
        PurchaseOrderDocumentDataProvider provider = new PurchaseOrderDocumentDataProvider(repository, approvalPrintService);
        PurchaseOrder po = new PurchaseOrder(); po.setId(71L);
        Part part = new Part(); part.setName("Garniture"); part.setUnit("pcs"); part.setCost(999d);
        PartQuantity line = new PartQuantity(); line.setPart(part); line.setQuantity(2d);
        Site receivingSite = new Site(); receivingSite.setName("Atelier Nord"); line.setSite(receivingSite);
        line.setPurchaseUnitPrice(new java.math.BigDecimal("125.5000"));
        line.setPurchasePriceCurrency("XOF");
        when(repository.findDocumentLinesByPurchaseOrderId(71L)).thenReturn(List.of(line));

        var values = provider.resolve(po, context, Set.of("purchaseOrder.lines"));
        var row = (java.util.Map<?, ?>) ((List<?>) values.get("purchaseOrder.lines")).get(0);
        assertEquals("125.5", row.get("unitPrice"));
        assertEquals("XOF", row.get("currency"));
        assertEquals("251", row.get("lineTotal"));
        assertEquals("Atelier Nord", row.get("site"));
        assertFalse(row.toString().contains("999"));
    }

    @Test
    void purchaseOrderProviderRejectsInventoryCostBindingsAndWrongSource() {
        PurchaseOrderDocumentDataProvider provider = new PurchaseOrderDocumentDataProvider(mock(PartQuantityRepository.class), approvalPrintService);
        assertThrows(CustomException.class, () -> provider.resolve(new PurchaseOrder(), context, Set.of("purchaseOrder.unitPrice")));
        assertThrows(CustomException.class, () -> provider.resolve(new Object(), context, Set.of("purchaseOrder.name")));
    }

    @Test
    void purchaseOrderShowsLinkedRequisitionReferencesWhenPresent() {
        PartQuantityRepository repository = mock(PartQuantityRepository.class);
        PurchaseOrderDocumentDataProvider provider = new PurchaseOrderDocumentDataProvider(repository, approvalPrintService);
        PurchaseOrder po = new PurchaseOrder(); po.setId(71L);
        PurchaseRequisition requisition = new PurchaseRequisition(); requisition.setId(31L);
        PurchaseRequisitionLine requestedLine = new PurchaseRequisitionLine(); requestedLine.setRequisition(requisition);
        PartQuantity orderLine = new PartQuantity(); orderLine.setRequisitionLine(requestedLine);
        when(repository.findDocumentLinesByPurchaseOrderId(71L)).thenReturn(List.of(orderLine));

        var values = provider.resolve(po, context, Set.of("purchaseOrder.requisition"));
        assertEquals("PR-31", values.get("purchaseOrder.requisition"));
    }

    @Test
    void purchaseRequisitionPrintIncludesRequesterAndRequestedQuantitiesOnly() {
        PurchaseRequisitionDocumentDataProvider provider = new PurchaseRequisitionDocumentDataProvider(approvalPrintService);
        PurchaseRequisition requisition = new PurchaseRequisition(); requisition.setId(31L);
        User requester = new User(); requester.setFirstName("Awa"); requester.setLastName("Koné"); requisition.setRequester(requester);
        Part part = new Part(); part.setName("Filtre"); part.setUnit("pcs"); part.setCost(5000.0);
        PurchaseRequisitionLine line = new PurchaseRequisitionLine(); line.setPart(part); line.setQuantity(4); line.setNotes("Pour la pompe P-101");
        Site requestedSite = new Site(); requestedSite.setName("Atelier Sud"); line.setSite(requestedSite);
        requisition.setLines(List.of(line));

        var values = provider.resolve(requisition, context, Set.of("purchaseRequisition.number", "purchaseRequisition.requester", "purchaseRequisition.lines"));
        assertEquals("PR-31", values.get("purchaseRequisition.number"));
        assertTrue(values.get("purchaseRequisition.requester").toString().contains("Awa"));
        var row = (java.util.Map<?, ?>) ((List<?>) values.get("purchaseRequisition.lines")).get(0);
        assertEquals(4.0, row.get("quantity"));
        assertEquals("pcs", row.get("unit"));
        assertEquals("Pour la pompe P-101", row.get("notes"));
        assertEquals("Atelier Sud", row.get("site"));
        assertFalse(row.containsKey("price"));
    }
}
