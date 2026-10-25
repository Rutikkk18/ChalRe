package com.Startup.chalre.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentFinalizationResult {
    private boolean success;
    @Builder.Default
    private boolean alreadyProcessed = false;
    private Long paymentId;
    private Long bookingId;
    private String status; // "SUCCESS", "REFUND_PENDING", "FAILED"
    private String message;
    @Builder.Default
    private boolean refundInitiated = false;
    private Long refundOutboxId;
}
