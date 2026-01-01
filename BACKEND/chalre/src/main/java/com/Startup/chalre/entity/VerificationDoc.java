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

    private String url;      // /uploads/verification/xyz.jpg
    private String docType;  // LICENSE, ID_CARD, PROFILE_PHOTO

    private LocalDateTime uploadedAt;
}
