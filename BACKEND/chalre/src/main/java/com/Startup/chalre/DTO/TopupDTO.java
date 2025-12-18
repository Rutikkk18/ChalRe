package com.Startup.chalre.DTO;

import lombok.Data;

@Data
public class TopupDTO {
    private Long amountPaise; // required
    private String provider; // optional, e.g., SIM
    private String idempotencyKey;
}
