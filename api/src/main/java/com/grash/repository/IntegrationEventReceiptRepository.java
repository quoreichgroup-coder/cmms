package com.grash.repository;

import com.grash.model.IntegrationEventReceipt;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

public interface IntegrationEventReceiptRepository extends JpaRepository<IntegrationEventReceipt, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select receipt from IntegrationEventReceipt receipt " +
            "where receipt.company.id = :companyId and receipt.providerKey = :providerKey " +
            "and receipt.idempotencyKey = :idempotencyKey")
    Optional<IntegrationEventReceipt> findByCompanyAndProviderAndIdempotencyKeyForUpdate(
            @Param("companyId") Long companyId, @Param("providerKey") String providerKey,
            @Param("idempotencyKey") String idempotencyKey);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select receipt from IntegrationEventReceipt receipt " +
            "where receipt.id = :id and receipt.company.id = :companyId")
    Optional<IntegrationEventReceipt> findByIdAndCompanyForUpdate(@Param("id") Long id,
                                                                  @Param("companyId") Long companyId);

    List<IntegrationEventReceipt> findByCompany_IdAndProviderKeyAndStatusAndLastAttemptAtBeforeOrderByLastAttemptAtAsc(
            Long companyId, String providerKey, com.grash.model.enums.IntegrationEventStatus status,
            java.util.Date staleBefore, Pageable pageable);
}
