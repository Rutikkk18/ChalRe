package com.Startup.chalre.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Entity
@Table(
    name = "notification_entity",
    indexes = {
        @Index(name = "idx_noti_user_created", columnList = "user_id, createdAt"),
        @Index(name = "idx_noti_expires", columnList = "expiresAt")
    }
)
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
    private Instant createdAt;
    private Instant expiresAt;

    @PrePersist
    public void onPrePersist() {
        if (this.createdAt == null) {
            this.createdAt = Instant.now();
        }
        if (this.expiresAt == null) {
            this.expiresAt = this.createdAt.plus(7, ChronoUnit.DAYS);
        }
    }
}
