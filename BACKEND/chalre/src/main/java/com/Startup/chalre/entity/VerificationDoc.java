package com.Startup.chalre.entity;



import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class VerificationDoc {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private User user;

    private String url;      // Cloud storage / S3 / Firebase URL
    private String docType;  // ID_CARD, LICENSE, PROFILE_PHOTO etc.
    private LocalDateTime uploadedAt;
}
