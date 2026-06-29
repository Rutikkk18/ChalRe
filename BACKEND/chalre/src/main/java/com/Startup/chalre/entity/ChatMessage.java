package com.Startup.chalre.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "chat_message", indexes = {
    @Index(name = "idx_chat_sender_id", columnList = "sender_id"),
    @Index(name = "idx_chat_receiver_id", columnList = "receiver_id"),
    @Index(name = "idx_chat_ride_id", columnList = "ride_id"),
    @Index(name = "idx_chat_receiver_is_read", columnList = "receiver_id, is_read"),
    @Index(name = "idx_chat_ride_created_at", columnList = "ride_id, created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private Ride ride;  // The ride this chat is about

    @ManyToOne
    private User sender;  // Who sent the message

    @ManyToOne
    private User receiver;  // Who receives the message

    private String message;

    private Boolean isRead = false;

    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
    }
}
