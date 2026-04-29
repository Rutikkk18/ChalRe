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
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String startLocation;
    private String endLocation;
    private String date;
    private String time;
    private String endTime;
    private int availableSeats;
    private double price;
    private String carModel;
    private String carType;
    private String genderPreference;
    private String note;

    @ManyToOne
    private User driver;

    @Column(nullable = false)
    private String status = "ACTIVE";

    public LocalDateTime getRideDateTime() {
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm");
        LocalDate rideDate = LocalDate.parse(this.date, dateFormatter);
        LocalTime rideTime = LocalTime.parse(this.time, timeFormatter);
        return LocalDateTime.of(rideDate, rideTime);
    }

    // ── GEO FIELDS ──────────────────────────────────────────
    private double fromLat;
    private double fromLng;
    private double toLat;
    private double toLng;

    @Column(columnDefinition = "TEXT")
    private String polyline;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(columnDefinition = "geometry(LineString,4326)")
    private org.locationtech.jts.geom.LineString route;

    private double distance;

    // ✅ ADD HERE
@Column(nullable = false)
private boolean isFallbackRoute = false;

    // ── TRANSIENT (not persisted, only in search results) ───
    @Transient
    private Boolean isPartial = false;

    /**
     * The user's actual requested board point (only set on partial ride results).
     * Different from fromLat/fromLng which is the driver's real origin.
     */
    @Transient
    private Double pickupLat;

    @Transient
    private Double pickupLng;

    /**
     * The user's actual requested alight point (only set on partial ride results).
     * Different from toLat/toLng which is the driver's real destination.
     */
    @Transient
    private Double dropLat;

    @Transient
    private Double dropLng;
}