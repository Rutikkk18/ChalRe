package com.Startup.chalre.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for driver earnings information
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DriverEarningsDTO {
    private Long totalEarnings; // in paise
    private Long pendingPayout; // in paise
    private Long paidAmount; // in paise
    private Long platformCommission; // in paise
    private Double commissionPercentage;
    
    // Helper methods for frontend display
    public Double getTotalEarningsInRupees() {
        return totalEarnings != null ? totalEarnings / 100.0 : 0.0;
    }
    
    public Double getPendingPayoutInRupees() {
        return pendingPayout != null ? pendingPayout / 100.0 : 0.0;
    }
    
    public Double getPaidAmountInRupees() {
        return paidAmount != null ? paidAmount / 100.0 : 0.0;
    }
    
    public Double getPlatformCommissionInRupees() {
        return platformCommission != null ? platformCommission / 100.0 : 0.0;
    }
}

