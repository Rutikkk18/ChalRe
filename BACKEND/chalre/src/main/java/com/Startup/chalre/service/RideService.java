package com.Startup.chalre.service;

import com.Startup.chalre.DTO.RideDTO;
import com.Startup.chalre.DTO.RideUpdateDTO;
import com.Startup.chalre.entity.Booking;
import com.Startup.chalre.entity.Ride;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.model.LatLng;
import com.Startup.chalre.model.RouteResponse;
import com.Startup.chalre.repository.BookingRepository;
import com.Startup.chalre.repository.RideRepository;
import com.Startup.chalre.utils.PolylineUtils;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RideService {

    private final RideRepository rideRepository;
    private final NotificationService notificationService;
    private final BookingRepository bookingRepository;
    private final MapService mapService;
    private final RouteService routeService;

    // CREATE RIDE
    public Ride createRide(RideDTO dto, User driver) {

        try {
            LocalDate rideDate = LocalDate.parse(dto.getDate());
            LocalDate today = LocalDate.now();
            if (rideDate.isBefore(today)) {
                throw new RuntimeException("Cannot create a ride in the past");
            }
            if (rideDate.equals(today) && dto.getTime() != null && !dto.getTime().isEmpty()) {
                try {
                    LocalTime rideTime = LocalTime.parse(dto.getTime());
                    if (rideTime.isBefore(LocalTime.now())) {
                        throw new RuntimeException("Cannot create a ride with past time for today");
                    }
                } catch (Exception e) {
                    if (e instanceof RuntimeException) throw e;
                }
            }
        } catch (Exception e) {
            if (e instanceof RuntimeException) throw e;
        }

        LatLng fromCoords = null;
        LatLng toCoords   = null;
        RouteResponse route = null;

        try {
            fromCoords = mapService.getCoordinates(dto.getStartLocation());
            toCoords   = mapService.getCoordinates(dto.getEndLocation());
            route = routeService.getRoute(
                    fromCoords.getLng(), fromCoords.getLat(),
                    toCoords.getLng(),   toCoords.getLat()
            );
        } catch (Exception e) {
            System.err.println("Geo/Route failed, ride will save without polyline: " + e.getMessage());
        }

        Ride ride = new Ride();
        ride.setStartLocation(dto.getStartLocation());
        ride.setEndLocation(dto.getEndLocation());
        ride.setDate(dto.getDate());
        ride.setTime(dto.getTime());
        ride.setEndTime(dto.getEndTime());
        ride.setAvailableSeats(dto.getAvailableSeats());
        ride.setPrice(dto.getPrice());
        ride.setCarModel(dto.getCarModel());
        ride.setCarType(dto.getCarType());
        ride.setGenderPreference(dto.getGenderPreference());
        ride.setNote(dto.getNote());
        ride.setDriver(driver);

        if (fromCoords != null) {
            ride.setFromLat(fromCoords.getLat());
            ride.setFromLng(fromCoords.getLng());
        }
        if (toCoords != null) {
            ride.setToLat(toCoords.getLat());
            ride.setToLng(toCoords.getLng());
        }
        if (route != null) {
            ride.setPolyline(route.getPolyline());
            ride.setDistance(route.getDistance());
        }

        Ride saved = rideRepository.save(ride);

        notificationService.sendNotification(
                driver,
                "Ride Created",
                "Your ride from " + ride.getStartLocation() + " to " + ride.getEndLocation() + " is created.",
                "RIDE_CREATED",
                Map.of("rideId", saved.getId().toString())
        );

        return saved;
    }

    public List<Ride> getallRides() {
        LocalDate today = LocalDate.now();
        return rideRepository.findAll().stream()
                .filter(ride -> ride.getAvailableSeats() > 0)
                .filter(ride -> {
                    try {
                        LocalDate rideDate = LocalDate.parse(ride.getDate());
                        return !rideDate.isBefore(today);
                    } catch (Exception e) {
                        return false;
                    }
                })
                .toList();
    }

    public List<Ride> searchRides(String from, String to, String date, Integer seats,
                                  Double minPrice, Double maxPrice, String carType,
                                  String genderPreference, String userGender) {

        List<Ride> rides = rideRepository
                .findByStartLocationContainingIgnoreCaseAndEndLocationContainingIgnoreCase(from, to)
                .stream()
                .filter(ride -> ride.getAvailableSeats() > 0)
                .toList();

        LocalDate today = LocalDate.now();
        rides = rides.stream()
                .filter(ride -> {
                    try {
                        LocalDate rideDate = LocalDate.parse(ride.getDate());
                        return !rideDate.isBefore(today);
                    } catch (Exception e) {
                        return false;
                    }
                })
                .toList();

        if (date != null && !date.isEmpty()) {
            rides = rides.stream().filter(r -> r.getDate().equals(date)).toList();
        }
        if (seats != null) {
            rides = rides.stream().filter(r -> r.getAvailableSeats() >= seats).toList();
        }
        if (minPrice != null) {
            rides = rides.stream().filter(r -> r.getPrice() >= minPrice).toList();
        }
        if (maxPrice != null) {
            rides = rides.stream().filter(r -> r.getPrice() <= maxPrice).toList();
        }
        if (carType != null && !carType.isEmpty()) {
            rides = rides.stream()
                    .filter(r -> r.getCarType() != null && r.getCarType().equalsIgnoreCase(carType))
                    .toList();
        }
        if (genderPreference != null && !genderPreference.isEmpty()) {
            rides = rides.stream()
                    .filter(r -> {
                        if (r.getGenderPreference() == null || r.getGenderPreference().isEmpty()) return true;
                        if (userGender != null && !userGender.isEmpty()) {
                            if (r.getGenderPreference().equals("MALE_ONLY") && userGender.equals("MALE")) return true;
                            if (r.getGenderPreference().equals("FEMALE_ONLY") && userGender.equals("FEMALE")) return true;
                            return false;
                        }
                        return true;
                    })
                    .toList();
        }

        return rides;
    }

    public Ride getRideById(Long id) {
        return rideRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ride not found"));
    }

    public List<Ride> getMyRides(User driver) {
        return rideRepository.findByDriver(driver);
    }

    public Map<String, List<Ride>> getMyRidesSeparated(User driver) {
        List<Ride> allRides = rideRepository.findByDriver(driver);
        LocalDate today = LocalDate.now();
        List<Ride> upcoming = new ArrayList<>();
        List<Ride> past = new ArrayList<>();

        for (Ride ride : allRides) {
            try {
                LocalDate rideDate = LocalDate.parse(ride.getDate());
                if (rideDate.isBefore(today)) past.add(ride);
                else upcoming.add(ride);
            } catch (Exception e) {
                upcoming.add(ride);
            }
        }

        Map<String, List<Ride>> result = new HashMap<>();
        result.put("upcoming", upcoming);
        result.put("past", past);
        return result;
    }

    public Map<String, Object> getRideBookings(Long rideId, User driver) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        if (!ride.getDriver().getId().equals(driver.getId())) {
            throw new RuntimeException("You are not the owner of this ride");
        }

        List<Booking> bookings = bookingRepository.findByRide(ride);
        List<Booking> activeBookings = bookings.stream()
                .filter(b -> "BOOKED".equals(b.getStatus()))
                .toList();

        Map<String, Object> result = new HashMap<>();
        result.put("ride", ride);
        result.put("allBookings", bookings);
        result.put("activeBookings", activeBookings);
        result.put("totalBookings", bookings.size());
        result.put("activeBookingsCount", activeBookings.size());
        return result;
    }

    public Ride updateRide(Long rideId, RideUpdateDTO dto, User driver) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        if (!ride.getDriver().getId().equals(driver.getId())) {
            throw new RuntimeException("You are not the owner of this ride");
        }

        String newDate = dto.getDate() != null ? dto.getDate() : ride.getDate();
        String newTime = dto.getTime() != null ? dto.getTime() : ride.getTime();

        try {
            LocalDate rideDate = LocalDate.parse(newDate);
            LocalDate today = LocalDate.now();
            if (rideDate.isBefore(today)) {
                throw new RuntimeException("Cannot update ride to a past date");
            }
            if (rideDate.equals(today) && newTime != null && !newTime.isEmpty()) {
                try {
                    LocalTime rideTime = LocalTime.parse(newTime);
                    if (rideTime.isBefore(LocalTime.now())) {
                        throw new RuntimeException("Cannot update ride to a past time for today");
                    }
                } catch (Exception e) {
                    if (e instanceof RuntimeException) throw e;
                }
            }
        } catch (Exception e) {
            if (e instanceof RuntimeException) throw e;
        }

        if (dto.getStartLocation() != null) ride.setStartLocation(dto.getStartLocation());
        if (dto.getEndLocation() != null) ride.setEndLocation(dto.getEndLocation());
        if (dto.getDate() != null) ride.setDate(dto.getDate());
        if (dto.getTime() != null) ride.setTime(dto.getTime());
        if (dto.getEndTime() != null) ride.setEndTime(dto.getEndTime());
        if (dto.getAvailableSeats() != null) ride.setAvailableSeats(dto.getAvailableSeats());
        if (dto.getPrice() != null) ride.setPrice(dto.getPrice());
        if (dto.getCarModel() != null) ride.setCarModel(dto.getCarModel());
        if (dto.getCarType() != null) ride.setCarType(dto.getCarType());
        if (dto.getGenderPreference() != null) ride.setGenderPreference(dto.getGenderPreference());
        if (dto.getNote() != null) ride.setNote(dto.getNote());

        Ride updated = rideRepository.save(ride);

        notificationService.sendNotification(
                driver,
                "Ride Updated",
                "Your ride has been updated successfully.",
                "RIDE_UPDATED",
                Map.of("rideId", ride.getId().toString())
        );

        return updated;
    }

    @Transactional
    public String cancelRide(Long rideId, User driver) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        if (!ride.getDriver().getId().equals(driver.getId())) {
            throw new RuntimeException("You are not the owner of this ride");
        }

        List<Booking> bookings = bookingRepository.findByRide(ride);
        int refundedCount = 0;

        for (Booking booking : bookings) {
            if ("BOOKED".equals(booking.getStatus())) {
                booking.setStatus("CANCELLED");
                if ("PAID".equalsIgnoreCase(booking.getPaymentStatus())) {
                    booking.setPaymentStatus("REFUNDED");
                    refundedCount++;
                }
                notificationService.sendNotification(
                        booking.getUser(),
                        "Ride Cancelled by Driver",
                        "The ride from " + ride.getStartLocation() + " to " + ride.getEndLocation()
                                + " has been cancelled by the driver. Refund will be processed.",
                        "RIDE_CANCELLED_BY_DRIVER",
                        Map.of(
                                "rideId", ride.getId().toString(),
                                "bookingId", booking.getId().toString()
                        )
                );
            }
            booking.setRide(null);
            bookingRepository.save(booking);
        }

        rideRepository.delete(ride);

        notificationService.sendNotification(
                driver,
                "Ride Cancelled",
                "Your ride has been cancelled. " + refundedCount + " passenger(s) refunded.",
                "RIDE_CANCELLED",
                Map.of("rideId", rideId.toString())
        );

        return "Ride cancelled successfully. " + refundedCount + " passenger(s) refunded.";
    }

    @Transactional
    public String deleteRide(Long rideId, User driver) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        if (!ride.getDriver().getId().equals(driver.getId())) {
            throw new RuntimeException("You are not the owner of this ride");
        }

        List<Booking> bookings = bookingRepository.findByRide(ride);
        boolean hasActiveBookings = bookings.stream()
                .anyMatch(b -> "BOOKED".equals(b.getStatus()));

        if (hasActiveBookings) {
            throw new RuntimeException("Cannot delete ride with active bookings. Please cancel the ride instead.");
        }

        rideRepository.delete(ride);

        notificationService.sendNotification(
                driver,
                "Ride Deleted",
                "Your ride from " + ride.getStartLocation() + " to " + ride.getEndLocation() + " has been deleted.",
                "RIDE_DELETED",
                Map.of("rideId", rideId.toString())
        );

        return "Ride deleted successfully";
    }

    // ── Geo-based search (text input → backend geocodes) ────
    public List<Ride> searchRidesByRoute(String pickup, String drop) {
        LatLng pickupCoords = mapService.getCoordinates(pickup);
        LatLng dropCoords   = mapService.getCoordinates(drop);

        if (pickupCoords == null || dropCoords == null) {
            System.err.println("Could not geocode: " + pickup + " or " + drop);
            return List.of();
        }

        return matchRides(pickupCoords, dropCoords);
    }

    // ── Geo search with direct coords (from frontend) ───────
    public List<Ride> searchRidesByCoords(double pickupLat, double pickupLng,
                                          double dropLat,   double dropLng) {
        LatLng pickupCoords = new LatLng(pickupLat, pickupLng);
        LatLng dropCoords   = new LatLng(dropLat,   dropLng);
        return matchRides(pickupCoords, dropCoords);
    }

    // ── CORE matching logic — shared by both search methods ─
    private List<Ride> matchRides(LatLng pickupCoords, LatLng dropCoords) {
        LocalDate today = LocalDate.now();

        return rideRepository.findAll().stream()
                .filter(r -> r.getAvailableSeats() > 0)
                .filter(r -> {
                    try {
                        return !LocalDate.parse(r.getDate()).isBefore(today);
                    } catch (Exception e) {
                        return false;
                    }
                })
                // ── FIX: was `return ,(r, pickupCoords, dropCoords)` — typo/corrupt paste ──
                .map(r -> {
                    r.setIsPartial(false);
                    return createPartialRide(r, pickupCoords, dropCoords);
                })
                // remove rides that didn't pass validation (createPartialRide returns null)
                .filter(r -> r != null)
                .toList();
    }

    private Ride createPartialRide(Ride r, LatLng pickup, LatLng drop) {

        // validate first
        if (!isValidMatch(r, pickup, drop)) return null;

        List<LatLng> points = PolylineUtils.decode(r.getPolyline());

        double pickupDist = PolylineUtils.getDistanceAlongRoute(pickup, points);
        double dropDist   = PolylineUtils.getDistanceAlongRoute(drop, points);

        // 🚫 FINAL HARD BLOCK (extra safety)
        if (dropDist <= pickupDist) return null;

        // 🔥 DO NOT MODIFY ORIGINAL RIDE
        Ride partial = new Ride();

        // copy needed fields
        partial.setId(r.getId());
        partial.setDriver(r.getDriver());
        partial.setDate(r.getDate());
        partial.setTime(r.getTime());
        partial.setAvailableSeats(r.getAvailableSeats());
        partial.setCarType(r.getCarType());
        partial.setCarModel(r.getCarModel());
        partial.setGenderPreference(r.getGenderPreference());

        partial.setIsPartial(true);

        // UI CHANGE: always carry original route locations for display
        partial.setStartLocation(r.getStartLocation());
        partial.setEndLocation(r.getEndLocation());

        // set user coords
        partial.setFromLat(pickup.getLat());
        partial.setFromLng(pickup.getLng());
        partial.setToLat(drop.getLat());
        partial.setToLng(drop.getLng());

        // PRICE CALC (route-based)
        double totalDist   = r.getDistance();
        double partialDist = dropDist - pickupDist;

        double ratio = (totalDist > 0) ? (partialDist / totalDist) : 1.0;
        ratio = Math.max(0.1, Math.min(1.0, ratio));

        partial.setPrice((double) Math.round(r.getPrice() * ratio));

        return partial;
    }

    // direction check
    private boolean isValidMatch(Ride r, LatLng pickupCoords, LatLng dropCoords) {

        if (r.getFromLat() == 0 || r.getToLat() == 0) return false;
        if (r.getPolyline() == null || r.getPolyline().isEmpty()) return false;

        List<LatLng> points = PolylineUtils.decode(r.getPolyline());
        if (points.size() < 2) return false;

        // MUST be near route FIRST
        if (!PolylineUtils.isPointNearRoute(pickupCoords, r.getPolyline()) ||
                !PolylineUtils.isPointNearRoute(dropCoords, r.getPolyline())) {
            return false;
        }

        // HARD DIRECTION CHECK (MOST IMPORTANT)
        if (!PolylineUtils.isForwardDirection(pickupCoords, dropCoords, points)) {
            return false;
        }

        LatLng start = points.get(0);
        LatLng end   = points.get(points.size() - 1);

        double pickupDist = PolylineUtils.getDistanceAlongRoute(pickupCoords, points);
        double dropDist   = PolylineUtils.getDistanceAlongRoute(dropCoords, points);

        double totalDist = 0.0;
        for (int i = 0; i < points.size() - 1; i++) {
            totalDist += PolylineUtils.haversineKm(points.get(i), points.get(i + 1));
        }

        // ABSOLUTE HARD BLOCK: BEHIND START
        double directDistFromStart = PolylineUtils.haversineKm(pickupCoords, start);

        // if projection says near start BUT actual distance is far → reject
        if (pickupDist <= 1.0 && directDistFromStart > 3.0) {
            return false;
        }

        // STRICT ORDER
        if (dropDist <= pickupDist + 1.0) {
            return false;
        }

        // EXTRA SAFETY: prevent reverse overlap edge cases
        if (dropDist <= pickupDist) {
            return false;
        }

        // BLOCK AFTER END
        double dropDistFromEnd = PolylineUtils.haversineKm(dropCoords, end);
        if (dropDist >= totalDist && dropDistFromEnd > 5.0) {
            return false;
        }

        return true;
    }

    // ── Phase 8: Calculate partial fare ─────────────────────
    public Map<String, Object> calculatePrice(Long rideId,
                                              Double pickupLat, Double pickupLng,
                                              Double dropLat,   Double dropLng) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        double fullPrice    = ride.getPrice();
        double fullDistance = ride.getDistance();

        if (fullDistance <= 0 || pickupLat == null || pickupLng == null
                || dropLat == null || dropLng == null) {
            return Map.of(
                    "fullPrice",       fullPrice,
                    "calculatedPrice", fullPrice,
                    "partialDistance", 0.0,
                    "fullDistance",    fullDistance,
                    "isPartial",       false
            );
        }

        LatLng pickupCoords = new LatLng(pickupLat, pickupLng);
        LatLng dropCoords   = new LatLng(dropLat,   dropLng);

        LatLng rideFrom = new LatLng(ride.getFromLat(), ride.getFromLng());
        LatLng rideTo   = new LatLng(ride.getToLat(),   ride.getToLng());

        double pickupFromStart = PolylineUtils.haversineKm(pickupCoords, rideFrom);
        double dropFromEnd     = PolylineUtils.haversineKm(dropCoords,   rideTo);

        // If pickup is near start AND drop is near end, it's the full route
        if (pickupFromStart <= 3.0 && dropFromEnd <= 3.0) {
            return Map.of(
                    "fullPrice",       fullPrice,
                    "calculatedPrice", fullPrice,
                    "partialDistance", fullDistance,
                    "fullDistance",    fullDistance,
                    "isPartial",       false
            );
        }

        double partialDistance   = PolylineUtils.haversineKm(pickupCoords, dropCoords);
        double fullHaversineDist = PolylineUtils.haversineKm(rideFrom, rideTo);

        double ratio = 1.0;
        if (fullHaversineDist > 0) {
            ratio = partialDistance / fullHaversineDist;
        }
        ratio = Math.min(ratio, 1.0);

        double calculatedPrice = Math.round(fullPrice * ratio);

        double minFare = Math.round(fullPrice * 0.20);
        calculatedPrice = Math.max(calculatedPrice, minFare);

        return Map.of(
                "fullPrice",       fullPrice,
                "calculatedPrice", calculatedPrice,
                "partialDistance", Math.round(partialDistance * 10.0) / 10.0,
                "fullDistance",    Math.round(fullDistance   * 10.0) / 10.0,
                "isPartial",       true
        );
    }
}