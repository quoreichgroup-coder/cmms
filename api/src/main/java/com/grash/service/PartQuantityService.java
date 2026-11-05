package com.grash.service;

import com.grash.dto.PartQuantityPatchDTO;
import com.grash.mapper.PartQuantityMapper;
import com.grash.model.PartQuantity;
import com.grash.repository.PartQuantityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PartQuantityService {
    private final PartQuantityRepository partQuantityRepository;
    private final PartQuantityMapper partQuantityMapper;
    private final ProcurementApprovalService procurementApprovals;

    public PartQuantity update(PartQuantity savedPartQuantity, PartQuantityPatchDTO patch) {
        requireEditable(savedPartQuantity);
        PartQuantity updated = partQuantityMapper.updatePartQuantity(savedPartQuantity, patch);
        if (patch.getPurchaseUnitPrice() != null && updated.getPurchaseOrder() != null) {
            updated.setPurchaseUnitPrice(patch.getPurchaseUnitPrice().setScale(4, RoundingMode.HALF_UP));
            updated.setPurchasePriceCurrency(purchaseCurrencyFor(updated));
        }
        return partQuantityRepository.save(updated);
    }

    public PartQuantity create(PartQuantity PartQuantity) {
        requireEditable(PartQuantity);
        snapshotPurchaseCost(PartQuantity);
        return partQuantityRepository.save(PartQuantity);
    }

    public void setAgreedPurchasePrice(PartQuantity line, BigDecimal unitPrice) {
        if (line.getPurchaseOrder() == null || unitPrice == null || unitPrice.signum() < 0
                || unitPrice.scale() > 4 || unitPrice.precision() > 19) {
            throw new IllegalArgumentException("A valid PO unit price with at most four decimals is required");
        }
        String currency = purchaseCurrencyFor(line);
        line.setPurchaseUnitPrice(unitPrice.setScale(4, RoundingMode.HALF_UP));
        line.setPurchasePriceCurrency(currency);
    }

    private String purchaseCurrencyFor(PartQuantity line) {
        String currency = line.getPurchasePriceCurrency();
        if (currency == null || currency.isBlank()) currency = line.getPurchaseCurrencySnapshot();
        if (line.getPurchaseOrder() != null && line.getPurchaseOrder().getId() != null) {
            List<String> existingCurrencies = partQuantityRepository.findByPurchaseOrder_Id(line.getPurchaseOrder().getId())
                    .stream()
                    .filter(existing -> line.getId() == null || !line.getId().equals(existing.getId()))
                    .map(existing -> existing.getPurchasePriceCurrency() != null
                            ? existing.getPurchasePriceCurrency() : existing.getPurchaseCurrencySnapshot())
                    .filter(existingCurrency -> existingCurrency != null && !existingCurrency.isBlank())
                    .distinct()
                    .toList();
            if (existingCurrencies.size() > 1)
                throw new IllegalArgumentException("Purchase order lines must use one currency");
            if (!existingCurrencies.isEmpty()) {
                String existingCurrency = existingCurrencies.get(0);
                if (currency != null && !currency.equals(existingCurrency))
                    throw new IllegalArgumentException("Purchase order lines must use one currency");
                currency = existingCurrency;
            }
        }
        if (currency == null || currency.isBlank()) currency = companyCurrency(line);
        if (currency == null || currency.isBlank() || currency.length() != 3)
            throw new IllegalArgumentException("A valid purchase currency is required");
        return currency;
    }

    private String companyCurrency(PartQuantity line) {
        if (line.getPurchaseOrder() == null || line.getPurchaseOrder().getCompany() == null) return null;
        var settings = line.getPurchaseOrder().getCompany().getCompanySettings();
        return settings == null || settings.getGeneralPreferences() == null
                || settings.getGeneralPreferences().getCurrency() == null ? null
                : settings.getGeneralPreferences().getCurrency().getCode();
    }

    private void snapshotPurchaseCost(PartQuantity line) {
        if (line.getPurchaseOrder() == null || line.getPurchaseUnitCostSnapshot() != null
                || line.getPart() == null || !Double.isFinite(line.getPart().getCost())
                || line.getPart().getCost() < 0) return;
        line.setPurchaseUnitCostSnapshot(BigDecimal.valueOf(line.getPart().getCost()).setScale(4, RoundingMode.HALF_UP));
        var company = line.getPurchaseOrder().getCompany();
        if (company != null && company.getCompanySettings() != null
                && company.getCompanySettings().getGeneralPreferences() != null
                && company.getCompanySettings().getGeneralPreferences().getCurrency() != null) {
            line.setPurchaseCurrencySnapshot(company.getCompanySettings().getGeneralPreferences().getCurrency().getCode());
        }
    }

    public Collection<PartQuantity> getAll() {
        return partQuantityRepository.findAll();
    }

    public void delete(PartQuantity partQuantity) {
        requireEditable(partQuantity);
        partQuantityRepository.delete(partQuantity);
    }

    public Optional<PartQuantity> findById(Long id) {
        return partQuantityRepository.findById(id);
    }

    public Collection<PartQuantity> findByCompany(Long id) {
        return partQuantityRepository.findByCompany_Id(id);
    }

    public Collection<PartQuantity> findByWorkOrder(Long id) {
        return partQuantityRepository.findByWorkOrder_Id(id);
    }

    public Collection<PartQuantity> findByPart(Long id) {
        return partQuantityRepository.findByPart_Id(id);
    }

    public Collection<PartQuantity> findByPurchaseOrder(Long id) {
        return partQuantityRepository.findByPurchaseOrder_Id(id);
    }


    public void save(PartQuantity partQuantity) {
        requireEditable(partQuantity);
        partQuantityRepository.save(partQuantity);
    }

    private void requireEditable(PartQuantity line) {
        if (line.getPurchaseOrder() != null) {
            var order = line.getPurchaseOrder();
            procurementApprovals.requireEditable("PO", order.getId(), order.getCompany().getId());
        }
    }
}
