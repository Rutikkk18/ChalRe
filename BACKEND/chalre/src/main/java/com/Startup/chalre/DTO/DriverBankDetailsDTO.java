package com.Startup.chalre.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for driver bank details operations
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DriverBankDetailsDTO {
    private String accountHolderName;
    private String bankName;
    private String accountNumber;
    private String ifscCode;
}

