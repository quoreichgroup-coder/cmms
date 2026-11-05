package com.grash.repository;

import com.grash.model.WebhookOutboxEvent;
import com.grash.model.enums.webhook.WebhookOutboxStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;

import java.util.List;

public interface WebhookOutboxEventRepository extends JpaRepository<WebhookOutboxEvent, Long> {

    List<WebhookOutboxEvent> findTop50ByCompanyIdAndStatusOrderByCreatedAtDesc(
            Long companyId, WebhookOutboxStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select event from WebhookOutboxEvent event where event.id = :id and event.companyId = :companyId")
    java.util.Optional<WebhookOutboxEvent> findByIdAndCompanyIdForUpdate(@Param("id") Long id,
                                                                         @Param("companyId") Long companyId);

    @Query(value = "select * from webhook_outbox_event " +
            "where (status = 'PENDING' and next_attempt_at <= :now) " +
            "or (status = 'PROCESSING' and claimed_at <= :staleBefore) " +
            "order by created_at asc limit 25 for update skip locked", nativeQuery = true)
    List<WebhookOutboxEvent> claimDue(@Param("now") java.util.Date now,
                                      @Param("staleBefore") java.util.Date staleBefore);
}
