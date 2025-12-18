package com.Startup.chalre.entity;


import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
public class Rating {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private User rater;         // passenger who rated

    @ManyToOne
    private Ride ride;          // optional: rating for specific ride

    @ManyToOne(optional = false)
    private User driver;        // rating target (driver)

    private int stars;          // 1..5

    @Column(length = 1000)
    private String comment;

    private LocalDateTime createdAt;



}
