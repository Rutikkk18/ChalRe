package com.Startup.chalre.repository;

import com.Startup.chalre.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByRazorpayOrderId(String razorpayOrderId);
    Optional<Payment> findByRazorpayPaymentId(String razorpayPaymentId);

    // Get latest successful payment for a ride (handles duplicate test payments)
    @Query("SELECT p FROM Payment p WHERE p.ride.id = :rideId AND p.status = 'SUCCESS' ORDER BY p.createdAt DESC")
    Optional<Payment> findLatestSuccessfulPaymentByRideId(@Param("rideId") Long rideId);
}