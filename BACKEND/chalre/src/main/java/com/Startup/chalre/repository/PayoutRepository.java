package com.Startup.chalre.repository;

import com.Startup.chalre.entity.Payout;
import com.Startup.chalre.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PayoutRepository extends JpaRepository<Payout, Long> {
    List<Payout> findByDriver(User driver);
    List<Payout> findByDriver_Id(Long driverId);
    List<Payout> findByDriver_IdOrderByInitiatedAtDesc(Long driverId);
    Optional<Payout> findByRazorpayPayoutId(String razorpayPayoutId);
    Optional<Payout> findByRazorpayTransferId(String razorpayTransferId);
    List<Payout> findByStatus(String status);
}

