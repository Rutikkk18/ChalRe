package com.Startup.chalre.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entity to track driver payout transactions
 * Records all payout attempts (successful, failed, pending)
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "payouts")
public class Payout {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "driver_id", nullable = false)
    private User driver;
    
    @Column(nullable = false)
    private Long amount; // Payout amount in paise
    
    @Column(nullable = false)
    private String status; // PENDING, PROCESSING, SUCCESS, FAILED, CANCELLED
    
    @Column(nullable = false)
    private String currency; // "INR"
    
    private String razorpayPayoutId; // Razorpay payout ID
    private String razorpayTransferId; // Razorpay transfer ID
    
    private String failureReason; // Reason for failure if status is FAILED
    private String failureCode; // Error code from Razorpay
    
    private LocalDateTime initiatedAt; // When payout was initiated
    private LocalDateTime processedAt; // When payout was processed (success/failure)
    
    private String initiatedBy; // "AUTO" or "MANUAL" (admin user ID)
    
    private String notes; // Additional notes
    
    @PrePersist
    protected void onCreate() {
        initiatedAt = LocalDateTime.now();
        if (status == null) {
            status = "PENDING";
        }
        if (currency == null) {
            currency = "INR";
        }
    }
}

