package com.Startup.chalre.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for payout information
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PayoutDTO {
    private Long id;
    private Long driverId;
    private String driverName;
    private Long amount; // in paise
    private String status;
    private String currency;
    private String razorpayPayoutId;
    private String failureReason;
    private String failureCode;
    private LocalDateTime initiatedAt;
    private LocalDateTime processedAt;
    private String initiatedBy;
    private String notes;
    
    // Helper method for frontend display
    public Double getAmountInRupees() {
        return amount != null ? amount / 100.0 : 0.0;
    }
}

