package com.Startup.chalre.repository;

import com.Startup.chalre.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByUser_Id(Long userId);
    List<Payment> findByRide_Id(Long rideId);
    Optional<Payment> findByIdAndUser_Id(Long id, Long userId);
    Optional<Payment> findByRazorpayOrderId(String razorpayOrderId);
}

