package com.grash.service;

import com.grash.dto.CategoryPatchDTO;
import com.grash.exception.CustomException;
import com.grash.mapper.PurchaseOrderCategoryMapper;
import com.grash.model.PurchaseOrderCategory;
import com.grash.model.User;
import com.grash.repository.PurchaseOrderCategoryRepository;
import com.grash.utils.Sanitizer;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PurchaseOrderCategoryService {
    private final PurchaseOrderCategoryRepository purchaseOrderCategoryRepository;

    private final PurchaseOrderCategoryMapper purchaseOrderCategoryMapper;

    public PurchaseOrderCategory create(PurchaseOrderCategory purchaseOrderCategory, User user) {
        Long companySettingsId = user.getCompany().getCompanySettings().getId();
        Sanitizer.sanitizeCategory(purchaseOrderCategory);
        Optional<PurchaseOrderCategory> categoryWithSameName =
                purchaseOrderCategoryRepository.findByNameIgnoreCaseAndCompanySettings_Id(
                        purchaseOrderCategory.getName(), companySettingsId);
        if (categoryWithSameName.isPresent()) {
            throw new CustomException("PurchaseOrderCategory with same name already exists", HttpStatus.NOT_ACCEPTABLE);
        }
        // Never trust the tenant association supplied in the request body.
        purchaseOrderCategory.setCompanySettings(user.getCompany().getCompanySettings());
        return purchaseOrderCategoryRepository.save(purchaseOrderCategory);
    }

    public PurchaseOrderCategory update(Long id, Long companySettingsId, CategoryPatchDTO purchaseOrderCategory) {
        PurchaseOrderCategory savedPurchaseOrderCategory = purchaseOrderCategoryRepository
                .findByIdAndCompanySettings_Id(id, companySettingsId)
                .orElseThrow(() -> new CustomException("Not found", HttpStatus.NOT_FOUND));
        PurchaseOrderCategory updatedPurchaseOrderCategory = purchaseOrderCategoryMapper
                .updatePurchaseOrderCategory(savedPurchaseOrderCategory, purchaseOrderCategory);
        Sanitizer.sanitizeCategory(updatedPurchaseOrderCategory);
        purchaseOrderCategoryRepository.findByNameIgnoreCaseAndCompanySettings_Id(
                        updatedPurchaseOrderCategory.getName(), companySettingsId)
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new CustomException("PurchaseOrderCategory with same name already exists",
                            HttpStatus.NOT_ACCEPTABLE);
                });
        return purchaseOrderCategoryRepository.save(updatedPurchaseOrderCategory);
    }

    public Collection<PurchaseOrderCategory> getAll() {
        return purchaseOrderCategoryRepository.findAll();
    }

    public void delete(Long id, Long companySettingsId) {
        PurchaseOrderCategory category = purchaseOrderCategoryRepository
                .findByIdAndCompanySettings_Id(id, companySettingsId)
                .orElseThrow(() -> new CustomException("Not found", HttpStatus.NOT_FOUND));
        purchaseOrderCategoryRepository.delete(category);
    }

    public Optional<PurchaseOrderCategory> findByIdAndCompanySettings(Long id, Long companySettingsId) {
        return purchaseOrderCategoryRepository.findByIdAndCompanySettings_Id(id, companySettingsId);
    }

    public Collection<PurchaseOrderCategory> findByCompanySettings(Long id) {
        return purchaseOrderCategoryRepository.findByCompanySettings_Id(id);
    }

}
