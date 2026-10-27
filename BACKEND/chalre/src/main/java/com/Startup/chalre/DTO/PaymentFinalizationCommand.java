package com.Startup.chalre.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentFinalizationCommand {
    private Long rideId;
    private Long userId; // May be null if webhook without user session
    private Long amountPaise;
    private Integer seats;
    private String razorpayOrderId;
    private String razorpayPaymentId;
    private String razorpaySignature;
    @Builder.Default
    private boolean signaturePreVerified = false;

    // Partial route passenger details
    private String passengerPickup;
    private String passengerDrop;
    private Double pickupLat;
    private Double pickupLng;
    private Double dropLat;
    private Double dropLng;
    private Double bookedPrice;
}
