package com.grash.service;

import com.grash.exception.CustomException;
import com.grash.model.Company;
import com.grash.model.CompanySettings;
import com.grash.model.PurchaseOrderCategory;
import com.grash.repository.PurchaseOrderCategoryRepository;
import com.grash.repository.PurchaseOrderRepository;
import com.grash.mapper.PurchaseOrderCategoryMapper;
import org.springframework.dao.DataIntegrityViolationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PurchaseOrderCategoryServiceTest {
    @Mock private PurchaseOrderCategoryRepository categories;
    @Mock private PurchaseOrderRepository orders;
    @Mock private PurchaseOrderCategoryMapper mapper;
    @InjectMocks private PurchaseOrderCategoryService service;

    @Test
    void categoryInUseCannotBeDeleted() {
        Company company = new Company();
        company.setId(7L);
        CompanySettings settings = new CompanySettings(company);
        settings.setId(70L);
        PurchaseOrderCategory category = new PurchaseOrderCategory("Maintenance", settings);
        category.setId(4L);
        when(categories.findByIdAndCompanySettings_Id(4L, 70L)).thenReturn(Optional.of(category));
        when(orders.existsByCategory_IdAndCompany_Id(4L, 7L)).thenReturn(true);

        CustomException error = assertThrows(CustomException.class, () -> service.delete(4L, 70L));

        assertEquals("purchase_order_category_in_use", error.getMessage());
        verify(categories, never()).delete(category);
    }

    @Test
    void unusedCategoryCanBeDeleted() {
        Company company = new Company();
        company.setId(7L);
        CompanySettings settings = new CompanySettings(company);
        settings.setId(70L);
        PurchaseOrderCategory category = new PurchaseOrderCategory("Maintenance", settings);
        category.setId(4L);
        when(categories.findByIdAndCompanySettings_Id(4L, 70L)).thenReturn(Optional.of(category));
        when(orders.existsByCategory_IdAndCompany_Id(4L, 7L)).thenReturn(false);

        service.delete(4L, 70L);

        verify(categories).delete(category);
    }

    @Test
    void concurrentCategoryReferenceIsTranslatedToConflict() {
        Company company = new Company();
        company.setId(7L);
        CompanySettings settings = new CompanySettings(company);
        settings.setId(70L);
        PurchaseOrderCategory category = new PurchaseOrderCategory("Maintenance", settings);
        category.setId(4L);
        when(categories.findByIdAndCompanySettings_Id(4L, 70L)).thenReturn(Optional.of(category));
        when(orders.existsByCategory_IdAndCompany_Id(4L, 7L)).thenReturn(false);
        org.mockito.Mockito.doThrow(new DataIntegrityViolationException("foreign key"))
                .when(categories).flush();
        org.mockito.Mockito.doNothing().when(categories).delete(category);

        CustomException error = assertThrows(CustomException.class, () -> service.delete(4L, 70L));

        assertEquals("purchase_order_category_in_use", error.getMessage());
    }
}
