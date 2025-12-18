package com.Startup.chalre.DTO;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class RideDTO {
    @NotBlank(message = "Start location is required")
    private String startLocation;
    
    @NotBlank(message = "End location is required")
    private String endLocation;
    
    @NotBlank(message = "Date is required")
    private String date;
    
    @NotBlank(message = "Time is required")
    private String time;
    
    @NotNull(message = "Available seats is required")
    @Min(value = 1, message = "At least 1 seat must be available")
    @Max(value = 10, message = "Maximum 10 seats allowed")
    private Integer availableSeats;
    
    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.01", message = "Price must be greater than 0")
    private Double price;
    
    private String carModel;  // Optional
    private String carType;  // Optional: SEDAN, SUV, HATCHBACK, etc.
    private String genderPreference;  // Optional: MALE_ONLY, FEMALE_ONLY
    private String note;  // Optional
}

