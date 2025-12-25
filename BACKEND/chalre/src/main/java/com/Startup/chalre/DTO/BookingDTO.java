package com.Startup.chalre.DTO;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BookingDTO {

    @NotNull(message = "Ride ID is required")
    private Long rideId;
    
    @NotNull(message = "Number of seats is required")
    @Min(value = 1, message = "At least 1 seat must be booked")
    private Integer seats;   // seats to book
    
    @NotNull(message = "Payment method is required")
    private String paymentMethod;   // "CASH" or "ONLINE"
    
    // Payment ID is optional - required only for ONLINE payment method
    // No @NotNull annotation - validation happens in service layer
    private Long paymentId;

}
