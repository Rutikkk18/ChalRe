package com.Startup.chalre.DTO;



import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class VerificationListDTO {

    private Long userId;
    private String name;
    private String email;
    private String phone;
    private String status;
    private int documentsCount;
    private LocalDateTime submittedAt;
}
