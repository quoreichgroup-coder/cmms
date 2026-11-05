package com.grash.controller;

import com.grash.advancedsearch.FilterField;
import com.grash.advancedsearch.SearchCriteria;
import com.grash.model.Company;
import com.grash.model.Role;
import com.grash.model.User;
import com.grash.model.enums.RoleType;
import com.grash.service.*;
import com.grash.mapper.*;
import com.grash.factory.MailServiceFactory;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.Page;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PurchaseOrderControllerSearchTest {
    @Mock PurchaseOrderService purchaseOrderService;
    @Mock PurchaseOrderApprovalService purchaseOrderApprovalService;
    @Mock UserService userService;
    @Mock PartQuantityService partQuantityService;
    @Mock MessageSource messageSource;
    @Mock PartQuantityMapper partQuantityMapper;
    @Mock PurchaseOrderMapper purchaseOrderMapper;
    @Mock MailServiceFactory mailServiceFactory;
    @Mock NotificationService notificationService;
    @Mock WorkflowService workflowService;
    @Mock VendorService vendorService;
    @Mock PurchaseOrderCategoryService purchaseOrderCategoryService;
    @Mock PurchaseOrderPolicyService purchaseOrderPolicyService;
    @Mock PartService partService;
    @Mock PurchaseOrderReceiptService purchaseOrderReceiptService;
    @Mock ProcurementApprovalService procurementApprovalService;
    @Mock ProcurementSiteService procurementSiteService;
    @Mock HttpServletRequest request;
    @InjectMocks PurchaseOrderController controller;

    @Test
    void searchAlwaysAddsTheAuthenticatedCompanyScope() {
        Company company = new Company();
        company.setId(72L);
        Role role = new Role();
        role.setRoleType(RoleType.ROLE_SUPER_ADMIN);
        User actor = new User();
        actor.setCompany(company);
        actor.setRole(role);
        SearchCriteria criteria = new SearchCriteria();
        criteria.setFilterFields(new ArrayList<>());
        when(userService.whoami(request)).thenReturn(actor);
        when(purchaseOrderService.findBySearchCriteria(any(), any())).thenReturn(Page.empty());

        controller.search(criteria, request);

        var captor = org.mockito.ArgumentCaptor.forClass(SearchCriteria.class);
        verify(purchaseOrderService).findBySearchCriteria(captor.capture(), org.mockito.ArgumentMatchers.same(actor));
        List<FilterField> filters = captor.getValue().getFilterFields();
        assertTrue(filters.stream().anyMatch(filter -> "company".equals(filter.getField())
                && Long.valueOf(72L).equals(Long.valueOf(filter.getValue().toString()))));
    }
}
