package com.Startup.chalre.entity;


import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity

public class Wallet {

    @Id
    private Long id; //same as user id

    @OneToOne
    @MapsId
    private User user;

    // store in paise (INR*100)
    private Long balance = 0L;


}
