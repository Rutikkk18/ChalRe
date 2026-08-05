package com.Startup.chalre.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAnalyticsResponse {

    private long totalUsers;
    private long drivers;
    private long passengers;
    private long verifiedDrivers;

    // Login method breakdown
    private long googleUsers;
    private long emailUsers;

    // Verification status
    private long pendingVerification;
    private long approvedVerification;
    private long rejectedVerification;
}
