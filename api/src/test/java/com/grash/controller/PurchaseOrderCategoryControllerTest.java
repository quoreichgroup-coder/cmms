package com.grash.controller;

import com.grash.model.Company;
import com.grash.model.CompanySettings;
import com.grash.model.Role;
import com.grash.model.User;
import com.grash.exception.CustomException;
import com.grash.model.enums.RoleType;
import com.grash.service.PurchaseOrderCategoryService;
import com.grash.service.PurchaseOrderPolicyService;
import com.grash.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.assertThrows;

@ExtendWith(MockitoExtension.class)
class PurchaseOrderCategoryControllerTest {
    @Mock PurchaseOrderCategoryService categoryService;
    @Mock PurchaseOrderPolicyService policyService;
    @Mock UserService userService;
    @Mock HttpServletRequest request;
    @InjectMocks PurchaseOrderCategoryController controller;

    @Test
    void elevatedRoleStillReadsCategoriesOnlyFromItsOwnTenant() {
        Company company = new Company();
        company.setId(72L);
        CompanySettings settings = new CompanySettings(company);
        settings.setId(501L);
        company.setCompanySettings(settings);
        Role role = new Role();
        role.setRoleType(RoleType.ROLE_SUPER_ADMIN);
        User actor = new User();
        actor.setCompany(company);
        actor.setRole(role);
        when(userService.whoami(request)).thenReturn(actor);

        controller.getAll(request);

        verify(policyService).requireModuleEnabled(actor);
        verify(categoryService).findByCompanySettings(501L);
        verify(categoryService, never()).getAll();
    }

    @Test
    void elevatedRoleCannotReadCategoriesWhenTheProcurementModuleIsDisabled() {
        Company company = new Company();
        company.setId(72L);
        CompanySettings settings = new CompanySettings(company);
        settings.setId(501L);
        company.setCompanySettings(settings);
        Role role = new Role();
        role.setRoleType(RoleType.ROLE_SUPER_ADMIN);
        User actor = new User();
        actor.setCompany(company);
        actor.setRole(role);
        when(userService.whoami(request)).thenReturn(actor);
        doThrow(new CustomException("Purchase order module is not enabled for this company",
                org.springframework.http.HttpStatus.FORBIDDEN)).when(policyService).requireModuleEnabled(actor);

        assertThrows(CustomException.class, () -> controller.getById(99L, request));

        verify(categoryService, never()).findByIdAndCompanySettings(anyLong(), anyLong());
    }
}
