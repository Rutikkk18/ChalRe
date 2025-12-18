package com.Startup.chalre.entity;


import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private User user;

    private String title;
    private String body;
    private String type; // BOOKING_CONFIRMED, RIDE_CANCELLED, WALLET_TOPUP
    private boolean readFlag;
    private LocalDateTime createdAt;

}
