package com.Startup.chalre.repository;

import com.Startup.chalre.entity.RefundOutbox;
import com.Startup.chalre.entity.RefundStatus;
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
public interface RefundOutboxRepository extends JpaRepository<RefundOutbox, Long> {

    Optional<RefundOutbox> findByIdempotencyKey(String idempotencyKey);

    List<RefundOutbox> findByPaymentId(Long paymentId);

    @Query("SELECT r FROM RefundOutbox r " +
           "WHERE r.status = :status " +
           "AND (r.lastAttemptAt IS NULL OR r.lastAttemptAt < :backoffThreshold) " +
           "AND r.retryCount < :maxRetries " +
           "ORDER BY r.id ASC")
    List<RefundOutbox> findClaimableRefunds(
            @Param("status") RefundStatus status,
            @Param("backoffThreshold") LocalDateTime backoffThreshold,
            @Param("maxRetries") int maxRetries,
            Pageable pageable
    );

    @Modifying
    @Query("UPDATE RefundOutbox r SET r.status = com.Startup.chalre.entity.RefundStatus.PROCESSING, " +
           "r.claimToken = :claimToken, r.claimedAt = :now, r.lastAttemptAt = :now, r.retryCount = r.retryCount + 1 " +
           "WHERE r.id = :id AND r.status = com.Startup.chalre.entity.RefundStatus.PENDING")
    int claimLease(
            @Param("id") Long id,
            @Param("claimToken") String claimToken,
            @Param("now") LocalDateTime now
    );

    @Modifying
    @Query("UPDATE RefundOutbox r SET r.status = com.Startup.chalre.entity.RefundStatus.PENDING, r.claimToken = NULL " +
           "WHERE r.status = com.Startup.chalre.entity.RefundStatus.PROCESSING AND r.claimedAt < :leaseThreshold")
    int releaseExpiredLeases(@Param("leaseThreshold") LocalDateTime leaseThreshold);
}
