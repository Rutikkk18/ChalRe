package com.Startup.chalre.repository;

import com.Startup.chalre.entity.PaymentRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PaymentRecordRepository extends JpaRepository<PaymentRecord, Long> {

    Optional<PaymentRecord> findByIdempotencyKey(String key);

    Optional<PaymentRecord> findByProviderOrderId(String providerOrderId);

    Optional<PaymentRecord> findByProviderPaymentId(String providerPaymentId); // REQUIRED

    @Query("SELECT p FROM PaymentRecord p WHERE p.user.id = :userId ORDER BY p.createdAt DESC")
    List<PaymentRecord> getByUser(@Param("userId") Long userId);
}
