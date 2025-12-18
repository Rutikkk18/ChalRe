package com.Startup.chalre.DTO;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class BookingDTO {

    @NotNull(message = "Ride ID is required")
    private Long rideId;
    
    @NotNull(message = "Number of seats is required")
    @Min(value = 1, message = "At least 1 seat must be booked")
    private Integer seats;   // seats to book
    
    @NotBlank(message = "Payment mode is required")
    private String paymentMode;   // from frontend: "WALLET" or "CASH"

}
