package com.Startup.chalre.repository;

import com.Startup.chalre.entity.WebhookEvent;
import com.Startup.chalre.entity.WebhookStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface WebhookEventRepository extends JpaRepository<WebhookEvent, Long> {

    Optional<WebhookEvent> findByEventId(String eventId);

    @Query("SELECT w FROM WebhookEvent w " +
           "WHERE w.status = com.Startup.chalre.entity.WebhookStatus.RECEIVED " +
           "OR (w.status = com.Startup.chalre.entity.WebhookStatus.PROCESSING AND w.claimedAt < :leaseThreshold) " +
           "OR (w.status = com.Startup.chalre.entity.WebhookStatus.FAILED AND w.lastAttemptAt < :retryThreshold) " +
           "ORDER BY w.id ASC")
    List<WebhookEvent> findRecoverableEvents(
            @Param("leaseThreshold") LocalDateTime leaseThreshold,
            @Param("retryThreshold") LocalDateTime retryThreshold,
            Pageable pageable
    );

    @Modifying
    @Query("UPDATE WebhookEvent w SET w.status = com.Startup.chalre.entity.WebhookStatus.PROCESSING, " +
           "w.claimToken = :claimToken, w.claimedAt = :now, w.lastAttemptAt = :now " +
           "WHERE w.id = :id AND (w.status = com.Startup.chalre.entity.WebhookStatus.RECEIVED OR w.status = com.Startup.chalre.entity.WebhookStatus.FAILED)")
    int claimLease(
            @Param("id") Long id,
            @Param("claimToken") String claimToken,
            @Param("now") LocalDateTime now
    );

    @Modifying
    @Query("UPDATE WebhookEvent w SET w.status = com.Startup.chalre.entity.WebhookStatus.RECEIVED, w.claimToken = NULL " +
           "WHERE w.status = com.Startup.chalre.entity.WebhookStatus.PROCESSING AND w.claimedAt < :leaseThreshold")
    int releaseExpiredLeases(@Param("leaseThreshold") LocalDateTime leaseThreshold);
}
