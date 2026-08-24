package com.Startup.chalre.DTO;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UserUpdateDTO {

    @Size(min = 2, max = 50, message = "Name must be between 2 and 50 characters")
    private String name;

    @Pattern(regexp = "^$|^\\d{10}$", message = "Phone number must be 10 digits")
    private String phone;

    private String profileImage;

    // ✅ Added for UPI setup (driver / user profile)
    @Size(max = 50, message = "UPI ID cannot exceed 50 characters")
    private String upiId;
}
