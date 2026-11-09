package com.grash.service;

import com.grash.exception.CustomException;
import com.grash.model.Company;
import com.grash.model.Role;
import com.grash.model.User;
import com.grash.model.Vendor;
import com.grash.model.enums.PermissionEntity;
import com.grash.repository.PurchaseOrderRepository;
import com.grash.repository.VendorRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VendorServiceTest {

    @InjectMocks
    private VendorService vendorService;
    @Mock
    private VendorRepository vendorRepository;
    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    private User user;
    private Vendor vendor;

    @BeforeEach
    void setUp() {
        Company company = new Company();
        company.setId(1L);
        Role role = Role.builder().id(1L)
                .deleteOtherPermissions(new HashSet<>(Set.of(PermissionEntity.VENDORS_AND_CUSTOMERS))).build();
        user = new User();
        user.setId(5L);
        user.setCompany(company);
        user.setRole(role);
        vendor = new Vendor();
        vendor.setId(7L);
        when(vendorRepository.findByIdAndCompany_Id(7L, 1L)).thenReturn(Optional.of(vendor));
    }

    @Test
    void vendorReferencedByPurchaseOrders_isNotDeleted() {
        when(purchaseOrderRepository.existsByVendor_IdAndCompany_Id(7L, 1L)).thenReturn(true);

        CustomException ex = assertThrows(CustomException.class, () -> vendorService.deleteByIdAndUser(7L, user));

        assertEquals(HttpStatus.CONFLICT, ex.getHttpStatus());
        verify(vendorRepository, never()).delete(any(Vendor.class));
    }

    @Test
    void unusedVendor_isDeleted() {
        when(purchaseOrderRepository.existsByVendor_IdAndCompany_Id(7L, 1L)).thenReturn(false);

        vendorService.deleteByIdAndUser(7L, user);

        verify(vendorRepository).delete(vendor);
    }
}
