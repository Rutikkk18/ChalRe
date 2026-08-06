package com.Startup.chalre.service;

import com.Startup.chalre.DTO.*;
import com.Startup.chalre.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * AnalyticsService — READ-ONLY analytics queries.
 *
 * Rules:
 *  - @Transactional(readOnly = true) on every method — guarantees no writes
 *  - Uses existing repositories and entities only — no new tables
 *  - All endpoints cached 5 minutes to reduce DB load
 *  - Never touches business logic (BookingService, PaymentService, etc.)
 */
@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final UserRepository    userRepository;
    private final RideRepository    rideRepository;
    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;

    private static final DateTimeFormatter MONTH_FMT =
            DateTimeFormatter.ofPattern("yyyy-MM");

    // ─────────────────────────────────────────────────────────────────────────
    // OVERVIEW
    // ─────────────────────────────────────────────────────────────────────────

    @Cacheable("analytics-overview")
    @Transactional(readOnly = true)
    public AnalyticsOverviewResponse getOverview() {

        long totalUsers    = userRepository.count();
        long totalRides    = rideRepository.count();
        long totalBookings = bookingRepository.count();

        LocalDateTime currentIstTime = LocalDateTime.now(java.time.ZoneId.of("Asia/Kolkata"));
        List<com.Startup.chalre.entity.Ride> allRides = rideRepository.findAll();

        long liveBookableRides = allRides.stream()
                .filter(r -> RideService.isRideLiveAndBookable(r, currentIstTime))
                .count();
        long cancelledRides = allRides.stream()
                .filter(r -> "CANCELLED".equals(r.getStatus()))
                .count();

        long confirmedBookings = bookingRepository.findAll().stream()
                .filter(b -> "BOOKED".equals(b.getStatus()))
                .count();
        long cancelledBookings = bookingRepository.findAll().stream()
                .filter(b -> "CANCELLED".equals(b.getStatus()))
                .count();

        List<com.Startup.chalre.entity.Payment> allPayments =
                paymentRepository.findAll();

        double totalRevenue = allPayments.stream()
                .filter(p -> com.Startup.chalre.entity.Payment.PaymentStatus.SUCCESS
                        .equals(p.getStatus()))
                .mapToDouble(p -> p.getAmount() / 100.0)
                .sum();

        long pendingPayouts = allPayments.stream()
                .filter(p -> p.getReleasedAt() != null
                        && (p.getDriverPaid() == null || !p.getDriverPaid())
                        && com.Startup.chalre.entity.Payment.PaymentStatus.SUCCESS
                        .equals(p.getStatus()))
                .count();

        long completedPayouts = allPayments.stream()
                .filter(p -> Boolean.TRUE.equals(p.getDriverPaid()))
                .count();

        long successCount = allPayments.stream()
                .filter(p -> com.Startup.chalre.entity.Payment.PaymentStatus.SUCCESS
                        .equals(p.getStatus()))
                .count();

        double avgBookingValue = successCount > 0 ? totalRevenue / successCount : 0.0;

        return AnalyticsOverviewResponse.builder()
                .totalUsers(totalUsers)
                .totalRides(totalRides)
                .totalBookings(totalBookings)
                .totalRevenue(totalRevenue)
                .liveBookableRides(liveBookableRides)
                .cancelledRides(cancelledRides)
                .confirmedBookings(confirmedBookings)
                .cancelledBookings(cancelledBookings)
                .pendingPayouts(pendingPayouts)
                .completedPayouts(completedPayouts)
                .avgBookingValue(avgBookingValue)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // USERS
    // ─────────────────────────────────────────────────────────────────────────

    @Cacheable("analytics-users")
    @Transactional(readOnly = true)
    public UserAnalyticsResponse getUserStats() {

        List<com.Startup.chalre.entity.User> users = userRepository.findAll();

        long total    = users.size();
        long drivers  = users.stream().filter(u -> "DRIVER".equals(u.getRole())).count();
        long passengers = total - drivers;

        long verified = users.stream()
                .filter(u -> Boolean.TRUE.equals(u.getIsDriverVerified()))
                .count();

        // Google users have uid set AND no password (Google-only accounts)
        // Email users have a password set
        long googleUsers = users.stream()
                .filter(u -> u.getUid() != null && !u.getUid().isBlank()
                        && (u.getPassword() == null || u.getPassword().isBlank()))
                .count();
        long emailUsers = users.stream()
                .filter(u -> u.getPassword() != null && !u.getPassword().isBlank())
                .count();

        long pending  = users.stream()
                .filter(u -> "PENDING".equals(u.getVerificationStatus())).count();
        long approved = users.stream()
                .filter(u -> "APPROVED".equals(u.getVerificationStatus())).count();
        long rejected = users.stream()
                .filter(u -> "REJECTED".equals(u.getVerificationStatus())).count();

        return UserAnalyticsResponse.builder()
                .totalUsers(total)
                .drivers(drivers)
                .passengers(passengers)
                .verifiedDrivers(verified)
                .googleUsers(googleUsers)
                .emailUsers(emailUsers)
                .pendingVerification(pending)
                .approvedVerification(approved)
                .rejectedVerification(rejected)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RIDES
    // ─────────────────────────────────────────────────────────────────────────

    @Cacheable("analytics-rides")
    @Transactional(readOnly = true)
    public RideAnalyticsResponse getRideStats() {

        List<com.Startup.chalre.entity.Ride> rides = rideRepository.findAll();

        LocalDateTime currentIstTime = LocalDateTime.now(java.time.ZoneId.of("Asia/Kolkata"));
        long total             = rides.size();
        long liveBookableRides = rides.stream()
                .filter(r -> RideService.isRideLiveAndBookable(r, currentIstTime))
                .count();
        long cancelled         = rides.stream()
                .filter(r -> "CANCELLED".equals(r.getStatus()))
                .count();

        double avgPrice = rides.stream()
                .mapToDouble(com.Startup.chalre.entity.Ride::getPrice)
                .average()
                .orElse(0.0);

        // Vehicle type breakdown
        Map<String, Long> vehicleCount = rides.stream()
                .collect(Collectors.groupingBy(
                        r -> resolveVehicleType(r.getVehicleType(), r.getCarType()),
                        Collectors.counting()
                ));
        List<Map<String, Object>> vehicleBreakdown = vehicleCount.entrySet().stream()
                .map(e -> Map.of("label", (Object) e.getKey(), "count", (Object) e.getValue()))
                .sorted(Comparator.comparingLong(m -> -((Long) m.get("count"))))
                .collect(Collectors.toList());

        // Top origins (city = first part of startLocation before comma)
        List<Map<String, Object>> topOrigins = rides.stream()
                .collect(Collectors.groupingBy(r -> extractCity(r.getStartLocation()), Collectors.counting()))
                .entrySet().stream()
                .sorted(Comparator.comparingLong(e -> -e.getValue()))
                .limit(8)
                .map(e -> Map.of("city", (Object) e.getKey(), "count", (Object) e.getValue()))
                .collect(Collectors.toList());

        // Top destinations
        List<Map<String, Object>> topDestinations = rides.stream()
                .collect(Collectors.groupingBy(r -> extractCity(r.getEndLocation()), Collectors.counting()))
                .entrySet().stream()
                .sorted(Comparator.comparingLong(e -> -e.getValue()))
                .limit(8)
                .map(e -> Map.of("city", (Object) e.getKey(), "count", (Object) e.getValue()))
                .collect(Collectors.toList());

        return RideAnalyticsResponse.builder()
                .totalRides(total)
                .liveBookableRides(liveBookableRides)
                .cancelledRides(cancelled)
                .averagePrice(avgPrice)
                .vehicleTypeBreakdown(vehicleBreakdown)
                .topOrigins(topOrigins)
                .topDestinations(topDestinations)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BOOKINGS
    // ─────────────────────────────────────────────────────────────────────────

    @Cacheable("analytics-bookings")
    @Transactional(readOnly = true)
    public BookingAnalyticsResponse getBookingStats() {

        List<com.Startup.chalre.entity.Booking> bookings = bookingRepository.findAll();

        long total     = bookings.size();
        long confirmed = bookings.stream().filter(b -> "BOOKED".equals(b.getStatus())).count();
        long cancelled = bookings.stream().filter(b -> "CANCELLED".equals(b.getStatus())).count();

        double cancellationRate = total > 0
                ? Math.round((cancelled * 1000.0 / total)) / 10.0
                : 0.0;

        double avgSeats = bookings.stream()
                .mapToInt(com.Startup.chalre.entity.Booking::getSeatsBooked)
                .average()
                .orElse(0.0);

        long partialRoute = bookings.stream()
                .filter(b -> b.getPassengerPickup() != null
                        && !b.getPassengerPickup().isBlank())
                .count();

        // Payment method breakdown
        Map<String, Long> methodCount = bookings.stream()
                .filter(b -> b.getPaymentMethod() != null)
                .collect(Collectors.groupingBy(
                        com.Startup.chalre.entity.Booking::getPaymentMethod,
                        Collectors.counting()
                ));
        List<Map<String, Object>> methodBreakdown = methodCount.entrySet().stream()
                .map(e -> Map.of("method", (Object) e.getKey(), "count", (Object) e.getValue()))
                .collect(Collectors.toList());

        return BookingAnalyticsResponse.builder()
                .totalBookings(total)
                .confirmedBookings(confirmed)
                .cancelledBookings(cancelled)
                .cancellationRate(cancellationRate)
                .avgSeatsPerBooking(Math.round(avgSeats * 10.0) / 10.0)
                .partialRouteBookings(partialRoute)
                .paymentMethodBreakdown(methodBreakdown)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PAYMENTS
    // ─────────────────────────────────────────────────────────────────────────

    @Cacheable("analytics-payments")
    @Transactional(readOnly = true)
    public PaymentAnalyticsResponse getPaymentStats() {

        List<com.Startup.chalre.entity.Payment> payments = paymentRepository.findAll();

        List<com.Startup.chalre.entity.Payment> successful = payments.stream()
                .filter(p -> com.Startup.chalre.entity.Payment.PaymentStatus.SUCCESS
                        .equals(p.getStatus()))
                .collect(Collectors.toList());

        double totalRevenue = successful.stream()
                .mapToDouble(p -> p.getAmount() / 100.0)
                .sum();

        double avgValue = successful.isEmpty() ? 0.0
                : totalRevenue / successful.size();

        long pendingPayouts = payments.stream()
                .filter(p -> p.getReleasedAt() != null
                        && (p.getDriverPaid() == null || !p.getDriverPaid())
                        && com.Startup.chalre.entity.Payment.PaymentStatus.SUCCESS
                        .equals(p.getStatus()))
                .count();

        long completedPayouts = payments.stream()
                .filter(p -> Boolean.TRUE.equals(p.getDriverPaid()))
                .count();

        // Monthly revenue (payments with createdAt)
        Map<String, Double> monthlyMap = new TreeMap<>();
        for (com.Startup.chalre.entity.Payment p : successful) {
            if (p.getCreatedAt() != null) {
                String month = p.getCreatedAt().format(MONTH_FMT);
                monthlyMap.merge(month, p.getAmount() / 100.0, Double::sum);
            }
        }
        List<Map<String, Object>> monthlyRevenue = monthlyMap.entrySet().stream()
                .map(e -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("month", e.getKey());
                    map.put("revenue", Math.round(e.getValue() * 100.0) / 100.0);
                    return map;
                })
                .collect(Collectors.toList());

        // Status breakdown
        Map<String, Long> statusMap = payments.stream()
                .collect(Collectors.groupingBy(
                        p -> p.getStatus() != null ? p.getStatus().name() : "UNKNOWN",
                        Collectors.counting()
                ));
        List<Map<String, Object>> statusBreakdown = statusMap.entrySet().stream()
                .map(e -> Map.of("status", (Object) e.getKey(), "count", (Object) e.getValue()))
                .collect(Collectors.toList());

        return PaymentAnalyticsResponse.builder()
                .totalRevenue(Math.round(totalRevenue * 100.0) / 100.0)
                .avgTransactionValue(Math.round(avgValue * 100.0) / 100.0)
                .totalTransactions((long) payments.size())
                .pendingPayouts(pendingPayouts)
                .completedPayouts(completedPayouts)
                .monthlyRevenue(monthlyRevenue)
                .statusBreakdown(statusBreakdown)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ROUTES
    // ─────────────────────────────────────────────────────────────────────────

    @Cacheable("analytics-routes")
    @Transactional(readOnly = true)
    public RouteAnalyticsResponse getRouteStats() {

        List<com.Startup.chalre.entity.Ride> rides = rideRepository.findAll();

        // OD pair counts
        Map<String, List<com.Startup.chalre.entity.Ride>> odMap = rides.stream()
                .collect(Collectors.groupingBy(
                        r -> extractCity(r.getStartLocation()) + " → "
                                + extractCity(r.getEndLocation())
                ));

        long uniqueRoutes = odMap.size();

        // Top OD pairs
        List<Map<String, Object>> topOdPairs = odMap.entrySet().stream()
                .sorted(Comparator.comparingInt(e -> -e.getValue().size()))
                .limit(10)
                .map(e -> {
                    String[] parts = e.getKey().split(" → ", 2);
                    double avg = e.getValue().stream()
                            .mapToDouble(com.Startup.chalre.entity.Ride::getPrice)
                            .average().orElse(0.0);
                    Map<String, Object> map = new HashMap<>();
                    map.put("from", parts.length > 0 ? parts[0] : "");
                    map.put("to", parts.length > 1 ? parts[1] : "");
                    map.put("count", (long) e.getValue().size());
                    map.put("avgPrice", Math.round(avg * 100.0) / 100.0);
                    return map;
                })
                .collect(Collectors.toList());

        String topRoute = topOdPairs.isEmpty() ? ""
                : topOdPairs.get(0).get("from") + " → " + topOdPairs.get(0).get("to");

        // Top origins
        List<Map<String, Object>> topOrigins = rides.stream()
                .collect(Collectors.groupingBy(r -> extractCity(r.getStartLocation()), Collectors.counting()))
                .entrySet().stream()
                .sorted(Comparator.comparingLong(e -> -e.getValue()))
                .limit(10)
                .map(e -> Map.of("city", (Object) e.getKey(), "count", (Object) e.getValue()))
                .collect(Collectors.toList());

        // Top destinations
        List<Map<String, Object>> topDestinations = rides.stream()
                .collect(Collectors.groupingBy(r -> extractCity(r.getEndLocation()), Collectors.counting()))
                .entrySet().stream()
                .sorted(Comparator.comparingLong(e -> -e.getValue()))
                .limit(10)
                .map(e -> Map.of("city", (Object) e.getKey(), "count", (Object) e.getValue()))
                .collect(Collectors.toList());

        return RouteAnalyticsResponse.builder()
                .totalUniqueRoutes(uniqueRoutes)
                .topRoutePair(topRoute)
                .topOrigins(topOrigins)
                .topDestinations(topDestinations)
                .topOdPairs(topOdPairs)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private String extractCity(String location) {
        if (location == null || location.isBlank()) return "Unknown";
        return location.split(",")[0].trim();
    }

    private String resolveVehicleType(String vehicleType, String carType) {
        if (vehicleType != null && !vehicleType.isBlank()) {
            return vehicleType.trim().toLowerCase();
        }
        if (carType == null || carType.isBlank()) return "unknown";
        String ct = carType.toLowerCase().trim();
        if (ct.equals("sedan") || ct.equals("suv") || ct.equals("hatchback")) return "car";
        if (ct.equals("bullet") || ct.equals("splendor") || ct.equals("shine")) return "bike";
        return "unknown";
    }
}
