package com.Startup.chalre.DTO;

import lombok.Data;

@Data
public class RideUpdateDTO {
    private String startLocation;
    private String endLocation;
    private String date;
    private String time;
    private Integer availableSeats;
    private Double price;
    private String carModel;  // Optional
    private String carType;  // Optional
    private String genderPreference;  // Optional
    private String note;  // Optional
}
