package com.grash.service;

import com.grash.dto.PartQuantityPatchDTO;
import com.grash.mapper.PartQuantityMapper;
import com.grash.model.*;
import com.grash.repository.PartQuantityRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PartQuantityServiceTest {
    @Mock PartQuantityRepository repository;
    @Mock PartQuantityMapper mapper;
    @Mock ProcurementApprovalService approvals;

    @Test void newPurchaseOrderLineFreezesInventoryEstimateAndCompanyCurrency() {
        Part part = new Part(); part.setCost(25.75d);
        Company company = new Company(); company.setId(4L);
        CompanySettings settings = new CompanySettings(company);
        com.grash.model.Currency currency = new com.grash.model.Currency(); currency.setCode("XOF");
        settings.getGeneralPreferences().setCurrency(currency); company.setCompanySettings(settings);
        PurchaseOrder order = new PurchaseOrder(); order.setId(70L); order.setCompany(company);
        PartQuantity line = new PartQuantity(part, null, order, 2d);
        when(repository.save(any(PartQuantity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        PartQuantityService service = new PartQuantityService(repository, mapper, approvals);

        PartQuantity saved = service.create(line);

        assertEquals(new BigDecimal("25.7500"), saved.getPurchaseUnitCostSnapshot());
        assertEquals("XOF", saved.getPurchaseCurrencySnapshot());
        assertEquals(51.5d, saved.getCost());
        service.setAgreedPurchasePrice(saved, new BigDecimal("38.125"));
        assertEquals(new BigDecimal("38.1250"), saved.getPurchaseUnitPrice());
        assertEquals("XOF", saved.getPurchasePriceCurrency());
        assertEquals(76.25d, saved.getCost());
        currency.setCode("USD");
        PartQuantityPatchDTO patch = new PartQuantityPatchDTO();
        patch.setPurchaseUnitPrice(new BigDecimal("40.25"));
        when(mapper.updatePartQuantity(saved, patch)).thenReturn(saved);
        service.update(saved, patch);
        assertEquals(new BigDecimal("40.2500"), saved.getPurchaseUnitPrice());
        assertEquals("XOF", saved.getPurchasePriceCurrency(),
                "editing an existing PO line must preserve its recorded currency");
        when(repository.findByPurchaseOrder_Id(70L)).thenReturn(java.util.List.of(saved));
        PartQuantity addedLine = new PartQuantity(part, null, order, 1d);
        service.setAgreedPurchasePrice(addedLine, new BigDecimal("12.00"));
        assertEquals("XOF", addedLine.getPurchasePriceCurrency(),
                "adding a line must inherit the PO's existing currency after company settings change");
        part.setCost(99d);
        assertEquals(80.5d, saved.getCost(), "later inventory cost changes must not rewrite saved PO prices");
        verify(repository, times(2)).save(line);
    }

    @Test void rejectsSupplierPriceWhenPurchaseOrderLinesHaveDifferentCurrencies() {
        PurchaseOrder order = new PurchaseOrder(); order.setId(70L);
        PartQuantity line = new PartQuantity(new Part(), null, order, 1d);
        line.setId(10L);
        line.setPurchasePriceCurrency("USD");
        PartQuantity sibling = new PartQuantity(new Part(), null, order, 1d);
        sibling.setId(11L);
        sibling.setPurchasePriceCurrency("XOF");
        when(repository.findByPurchaseOrder_Id(70L)).thenReturn(java.util.List.of(line, sibling));
        PartQuantityService service = new PartQuantityService(repository, mapper, approvals);

        assertThrows(IllegalArgumentException.class,
                () -> service.setAgreedPurchasePrice(line, new BigDecimal("12.00")));
        verify(repository, never()).save(any());
    }
}
