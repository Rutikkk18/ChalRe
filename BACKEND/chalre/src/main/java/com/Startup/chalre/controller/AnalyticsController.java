package com.Startup.chalre.controller;

import com.Startup.chalre.DTO.*;
import com.Startup.chalre.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * AnalyticsController — Read-only admin analytics endpoints.
 *
 * All endpoints:
 *  - Protected by ROLE_ADMIN (inherits from SecurityConfig /api/admin/**)
 *  - Return strongly-typed DTOs
 *  - Delegate entirely to AnalyticsService (no business logic here)
 *  - Cached at service layer (5 minutes)
 *
 * DOES NOT modify any existing controller, service, entity, or repository.
 */
@RestController
@RequestMapping("/api/admin/analytics")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/overview")
    public ResponseEntity<AnalyticsOverviewResponse> getOverview() {
        return ResponseEntity.ok(analyticsService.getOverview());
    }

    @GetMapping("/users")
    public ResponseEntity<UserAnalyticsResponse> getUsers() {
        return ResponseEntity.ok(analyticsService.getUserStats());
    }

    @GetMapping("/rides")
    public ResponseEntity<RideAnalyticsResponse> getRides() {
        return ResponseEntity.ok(analyticsService.getRideStats());
    }

    @GetMapping("/bookings")
    public ResponseEntity<BookingAnalyticsResponse> getBookings() {
        return ResponseEntity.ok(analyticsService.getBookingStats());
    }

    @GetMapping("/payments")
    public ResponseEntity<PaymentAnalyticsResponse> getPayments() {
        return ResponseEntity.ok(analyticsService.getPaymentStats());
    }

    @GetMapping("/routes")
    public ResponseEntity<RouteAnalyticsResponse> getRoutes() {
        return ResponseEntity.ok(analyticsService.getRouteStats());
    }
}
