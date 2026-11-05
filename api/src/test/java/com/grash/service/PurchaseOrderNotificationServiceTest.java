package com.grash.service;

import com.grash.dto.PurchaseOrderShowDTO;
import com.grash.factory.MailServiceFactory;
import com.grash.model.Company;
import com.grash.model.Role;
import com.grash.model.User;
import com.grash.model.enums.Language;
import com.grash.model.enums.PermissionEntity;
import com.grash.model.enums.RoleType;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import com.grash.model.Notification;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PurchaseOrderNotificationServiceTest {
    private final UserService userService = mock(UserService.class);
    private final NotificationService notificationService = mock(NotificationService.class);
    private final MailServiceFactory mailServiceFactory = mock(MailServiceFactory.class);
    private final MailService mailService = mock(MailService.class);
    private final org.springframework.context.MessageSource messageSource =
            mock(org.springframework.context.MessageSource.class);
    private final PurchaseOrderNotificationService service = new PurchaseOrderNotificationService(
            userService, notificationService, mailServiceFactory, messageSource);

    @AfterEach
    void clearTransactionSynchronization() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void createdNotificationIsSentOnlyAfterCommit() {
        Company company = new Company();
        company.setId(5L);
        User actor = new User();
        actor.setId(7L);
        actor.setCompany(company);
        actor.setLanguage(Language.EN);

        User administrator = new User();
        administrator.setEnabled(true);
        administrator.setEmail("admin@example.test");
        Role role = new Role();
        role.setRoleType(RoleType.ROLE_CLIENT);
        role.setViewPermissions(Set.of(PermissionEntity.SETTINGS));
        administrator.setRole(role);
        when(userService.findByCompany(5L)).thenReturn(List.of(administrator));
        when(messageSource.getMessage(eq("new_po"), isNull(), eq(Locale.ENGLISH))).thenReturn("New purchase order");
        when(messageSource.getMessage(eq("notification_new_po_request"), any(Object[].class), eq(Locale.ENGLISH)))
                .thenReturn("PO approval required");
        when(mailServiceFactory.getMailService()).thenReturn(mailService);
        ReflectionTestUtils.setField(service, "frontendUrl", "https://qpm.example.test");

        PurchaseOrderShowDTO order = new PurchaseOrderShowDTO();
        order.setId(29L);
        order.setName("PO-29");
        TransactionSynchronizationManager.initSynchronization();

        service.notifyCreatedAfterCommit(order, actor, new BigDecimal("500.00"), "XOF");

        verifyNoInteractions(notificationService, mailServiceFactory);
        TransactionSynchronizationManager.getSynchronizations().forEach(sync -> sync.afterCommit());

        org.mockito.ArgumentCaptor<List<Notification>> notifications =
                org.mockito.ArgumentCaptor.forClass((Class) List.class);
        verify(notificationService).createMultiple(notifications.capture(), eq(true), eq("New purchase order"));
        assertEquals(1, notifications.getValue().size());
        assertEquals("PO approval required", notifications.getValue().get(0).getMessage());
        assertEquals(29L, notifications.getValue().get(0).getResourceId());
        org.mockito.ArgumentCaptor<Map<String, Object>> mailVariables =
                org.mockito.ArgumentCaptor.forClass((Class) Map.class);
        verify(mailService).sendMessageUsingThymeleafTemplate(any(String[].class),
                eq("New purchase order"), mailVariables.capture(), eq("new-purchase-order.html"),
                eq(Locale.ENGLISH), isNull());
        assertEquals("PO approval required", mailVariables.getValue().get("message"));
        assertEquals("https://qpm.example.test/app/purchase-orders/29",
                mailVariables.getValue().get("purchaseOrderLink"));
    }
}
