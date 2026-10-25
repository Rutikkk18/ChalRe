package com.Startup.chalre.repository;

import com.Startup.chalre.entity.SeatHold;
import com.Startup.chalre.entity.SeatHoldStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface SeatHoldRepository extends JpaRepository<SeatHold, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM SeatHold s WHERE s.id = :id")
    Optional<SeatHold> findByIdForUpdate(@Param("id") Long id);

    Optional<SeatHold> findByHoldReference(String holdReference);

    Optional<SeatHold> findByRazorpayOrderId(String razorpayOrderId);

    @Query("SELECT COALESCE(SUM(s.seatsHeld), 0) FROM SeatHold s " +
           "WHERE s.ride.id = :rideId " +
           "AND s.status IN :activeStatuses " +
           "AND (s.status = com.Startup.chalre.entity.SeatHoldStatus.EXPIRED_UNRECONCILED OR s.expiresAt > :now) " +
           "AND (:exemptHoldId IS NULL OR s.id != :exemptHoldId)")
    int sumActiveHeldSeats(
            @Param("rideId") Long rideId,
            @Param("activeStatuses") Collection<SeatHoldStatus> activeStatuses,
            @Param("now") LocalDateTime now,
            @Param("exemptHoldId") Long exemptHoldId
    );

    @Query("SELECT s FROM SeatHold s WHERE s.status IN :statuses AND s.expiresAt <= :now")
    List<SeatHold> findExpiredHolds(
            @Param("statuses") Collection<SeatHoldStatus> statuses,
            @Param("now") LocalDateTime now
    );

    @Query("SELECT s FROM SeatHold s " +
           "WHERE s.status IN :statuses " +
           "AND s.expiresAt <= :now " +
           "AND (s.lastReconciledAt IS NULL OR s.lastReconciledAt < :retryThreshold) " +
           "ORDER BY s.expiresAt ASC")
    List<SeatHold> findExpiredHoldsForSweeper(
            @Param("statuses") Collection<SeatHoldStatus> statuses,
            @Param("now") LocalDateTime now,
            @Param("retryThreshold") LocalDateTime retryThreshold,
            Pageable pageable
    );
}
