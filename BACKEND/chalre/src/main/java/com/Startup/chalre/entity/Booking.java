package com.Startup.chalre.entity;


import jakarta.persistence.*;
import jdk.jfr.Enabled;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    //passenger who booked
    @ManyToOne
    private User user;

    //ride that was booked
    @ManyToOne
    private Ride ride;

    private int seatsBooked;

    // Booking Status: "BOOKED" (confirmed immediately), "CANCELLED"
    // No admin approval needed - driver is already assigned from the ride
    private String status;

    private String bookingTime;  // booking time for history

    private String paymentMethod;  // "CASH" or "ONLINE"
    
    @ManyToOne
    private Payment payment;  // Link to Payment entity (null for CASH payments)
    
    // Payment Status: "PAID" (online), "PENDING" (cash - waiting for driver), "REFUNDED"
    // Note: Payment status is separate from booking status
    private String paymentStatus;

}
