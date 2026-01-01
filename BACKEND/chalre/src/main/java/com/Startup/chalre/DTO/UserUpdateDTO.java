package com.Startup.chalre.DTO;

import lombok.Data;

@Data
public class UserUpdateDTO {

    private String name;
    private String phone;
    private String profileImage;

    // ✅ Added for UPI setup (driver / user profile)
    private String upiId;
}
