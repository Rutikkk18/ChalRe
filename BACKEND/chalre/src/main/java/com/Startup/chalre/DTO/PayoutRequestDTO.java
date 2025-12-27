package com.Startup.chalre.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for initiating a payout request
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PayoutRequestDTO {
    private Long driverId; // Optional: if admin initiating payout
    private Long amount; // Amount in paise (optional: if null, payout all pending)
    private String notes; // Optional notes
}

