package com.Startup.chalre.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;


@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Ride {

    @Id
    @GeneratedValue(strategy= GenerationType.IDENTITY)
    private Long id;

    private String startLocation;

    private String endLocation;

    private String date;

    private String time;

    private int availableSeats;

    private double price;

    private String carModel;  // Optional: e.g., Swift, Baleno, i20
    
    private String carType;  // SEDAN, SUV, HATCHBACK, etc.

    private String genderPreference;  // MALE_ONLY, FEMALE_ONLY, or null (no preference)

    private String note;  // Optional: Additional notes or special instructions

    // Link ride to driver
    @ManyToOne
    private User driver;

    public LocalDateTime getRideDateTime() {
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm");

        LocalDate rideDate = LocalDate.parse(this.date, dateFormatter);
        LocalTime rideTime = LocalTime.parse(this.time, timeFormatter);

        return LocalDateTime.of(rideDate, rideTime);
    }

}
