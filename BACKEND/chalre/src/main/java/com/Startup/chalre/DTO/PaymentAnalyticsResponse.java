package com.Startup.chalre.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentAnalyticsResponse {

    private double totalRevenue;       // rupees, successful payments only
    private double avgTransactionValue; // rupees
    private long totalTransactions;
    private long pendingPayouts;
    private long completedPayouts;

    // Monthly revenue breakdown — each entry: { month: "YYYY-MM", revenue: N }
    private List<Map<String, Object>> monthlyRevenue;

    // Payment status breakdown — each entry: { status: "...", count: N }
    private List<Map<String, Object>> statusBreakdown;
}
