package com.grash.repository;

import com.grash.model.WebhookOutboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface WebhookOutboxEventRepository extends JpaRepository<WebhookOutboxEvent, Long> {

    @Query(value = "select * from webhook_outbox_event " +
            "where (status = 'PENDING' and next_attempt_at <= :now) " +
            "or (status = 'PROCESSING' and claimed_at <= :staleBefore) " +
            "order by created_at asc limit 25 for update skip locked", nativeQuery = true)
    List<WebhookOutboxEvent> claimDue(@Param("now") java.util.Date now,
                                      @Param("staleBefore") java.util.Date staleBefore);
}
