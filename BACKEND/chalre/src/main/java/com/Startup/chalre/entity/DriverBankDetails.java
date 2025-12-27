package com.Startup.chalre.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entity to store driver bank account details for payouts
 * Account number is stored encrypted/tokenized for security
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "driver_bank_details", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"driver_id"}) // One bank account per driver
})
public class DriverBankDetails {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @OneToOne
    @JoinColumn(name = "driver_id", nullable = false, unique = true)
    private User driver;
    
    @Column(nullable = false)
    private String accountHolderName;
    
    @Column(nullable = false)
    private String bankName;
    
    @Column(nullable = false)
    private String accountNumber; // Encrypted/tokenized in production
    
    @Column(nullable = false)
    private String ifscCode; // IFSC code for Indian banks
    
    @Column(nullable = false)
    private String verificationStatus; // PENDING, VERIFIED, REJECTED
    
    private String razorpayContactId; // Razorpay contact ID for payouts
    private String razorpayFundAccountId; // Razorpay fund account ID
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime verifiedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (verificationStatus == null) {
            verificationStatus = "PENDING";
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

