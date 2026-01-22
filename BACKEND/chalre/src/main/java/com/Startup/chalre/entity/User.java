package com.Startup.chalre.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;


@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true)
    private String uid;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = true, unique = true)
    private String phone;

    private String profileImage;  // URL to profile image

    private String password;

    private String role; //rider user default


    private Double avgRating = 0.0;
    private Integer ratingCount = 0;

    private Boolean isDriverVerified = false;
    private String verificationStatus = "NOT_SUBMITTED"; // PENDING / APPROVED / REJECTED
    private String verificationRemarks;


    private String upiId;

    private String gender;  // MALE, FEMALE, OTHER, or null (no preference)

    @Column(length = 500)
    private String profileImageUrl;


}
