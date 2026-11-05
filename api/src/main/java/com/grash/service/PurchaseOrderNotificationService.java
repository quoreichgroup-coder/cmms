package com.grash.service;

import com.grash.dto.PurchaseOrderShowDTO;
import com.grash.factory.MailServiceFactory;
import com.grash.model.Notification;
import com.grash.model.User;
import com.grash.model.enums.NotificationType;
import com.grash.model.enums.PermissionEntity;
import com.grash.model.enums.RoleCode;
import com.grash.utils.Helper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.MessageSource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class PurchaseOrderNotificationService {
    private final UserService userService;
    private final NotificationService notificationService;
    private final MailServiceFactory mailServiceFactory;
    private final MessageSource messageSource;

    @Value("${frontend.url}")
    private String frontendUrl;

    public void notifyCreatedAfterCommit(PurchaseOrderShowDTO order, User actor, BigDecimal estimatedAmount,
                                         String currency) {
        Runnable notification = () -> {
            try {
                notifyCreated(order, actor, estimatedAmount, currency);
            } catch (RuntimeException exception) {
                log.error("Purchase order {} was created, but its notification could not be sent",
                        order.getId(), exception);
            }
        };
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    notification.run();
                }
            });
        } else {
            notification.run();
        }
    }

    private void notifyCreated(PurchaseOrderShowDTO order, User actor, BigDecimal estimatedAmount, String currency) {
        var locale = Helper.getLocale(actor);
        String title = messageSource.getMessage("new_po", null, locale);
        String message = messageSource.getMessage("notification_new_po_request",
                new Object[]{order.getName(), estimatedAmount, currency}, locale);
        var recipients = userService.findByCompany(actor.getCompany().getId()).stream()
                .filter(candidate -> candidate.isEnabled() && candidate.getRole() != null
                        && candidate.getRole().getViewPermissions() != null
                        && (candidate.getRole().getViewPermissions().contains(PermissionEntity.SETTINGS)
                        || candidate.getRole().getCode() == RoleCode.LIMITED_ADMIN))
                .toList();
        notificationService.createMultiple(recipients.stream()
                .map(candidate -> new Notification(message, candidate, NotificationType.PURCHASE_ORDER, order.getId()))
                .toList(), true, title);

        String[] emailRecipients = recipients.stream()
                .filter(candidate -> candidate.getUserSettings() != null
                        && candidate.getUserSettings().shouldEmailUpdatesForPurchaseOrders())
                .map(User::getEmail).filter(email -> email != null && !email.isBlank()).toArray(String[]::new);
        Map<String, Object> mailVariables = new HashMap<>();
        mailVariables.put("purchaseOrderLink", frontendUrl + "/app/purchase-orders/" + order.getId());
        mailVariables.put("message", message);
        mailServiceFactory.getMailService().sendMessageUsingThymeleafTemplate(emailRecipients, title, mailVariables,
                "new-purchase-order.html", locale, null);
    }
}
