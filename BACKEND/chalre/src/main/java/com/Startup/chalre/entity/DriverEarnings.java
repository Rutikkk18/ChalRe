package com.Startup.chalre.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entity to track driver earnings and payout status
 * Tracks total earnings, pending payouts, and paid amounts
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "driver_earnings", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"driver_id"}) // One earnings record per driver
})
public class DriverEarnings {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @OneToOne
    @JoinColumn(name = "driver_id", nullable = false, unique = true)
    private User driver;
    
    @Column(nullable = false)
    private Long totalEarnings; // Total earnings in paise (including commission)
    
    @Column(nullable = false)
    private Long pendingPayout; // Amount pending payout in paise
    
    @Column(nullable = false)
    private Long paidAmount; // Total amount paid out in paise
    
    @Column(nullable = false)
    private Long platformCommission; // Total platform commission in paise
    
    @Column(nullable = false)
    private Double commissionPercentage; // Platform commission percentage (e.g., 10.0 for 10%)
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (totalEarnings == null) totalEarnings = 0L;
        if (pendingPayout == null) pendingPayout = 0L;
        if (paidAmount == null) paidAmount = 0L;
        if (platformCommission == null) platformCommission = 0L;
        if (commissionPercentage == null) commissionPercentage = 10.0; // Default 10% commission
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

