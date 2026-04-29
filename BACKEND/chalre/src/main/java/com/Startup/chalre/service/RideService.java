package com.Startup.chalre.service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

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

@Service
@RequiredArgsConstructor
public class RideService {

    private final RideRepository rideRepository;
    private final NotificationService notificationService;
    private final BookingRepository bookingRepository;
    private final MapService mapService;
    private final RouteService routeService;
    private static final double MATCH_RADIUS_KM = 15.0;
    // ── CREATE RIDE ──────────────────────────────────────────
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
        LatLng toCoords = null;
        RouteResponse route = null;

        try {
            fromCoords = mapService.getCoordinates(dto.getStartLocation());
            toCoords = mapService.getCoordinates(dto.getEndLocation());
            route = routeService.getRoute(
                    fromCoords.getLng(), fromCoords.getLat(),
                    toCoords.getLng(), toCoords.getLat()
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
            ride.setIsFallbackRoute(route.isFallback());

            try {
                List<LatLng> points = PolylineUtils.decode(route.getPolyline());
                org.locationtech.jts.geom.LineString jtsRoute = PolylineUtils.createJTSLineString(points);
                ride.setRoute(jtsRoute);
            } catch (Exception e) {
                System.err.println("Could not create JTS LineString: " + e.getMessage());
            }
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

    // ── GET ALL RIDES ────────────────────────────────────────
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

    // ── SEARCH RIDES (text-based) ────────────────────────────
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
                        if (r.getGenderPreference() == null || r.getGenderPreference().isEmpty())
                            return true;
                        if (userGender != null && !userGender.isEmpty()) {
                            if (r.getGenderPreference().equals("MALE_ONLY") && userGender.equals("MALE"))
                                return true;
                            if (r.getGenderPreference().equals("FEMALE_ONLY") && userGender.equals("FEMALE"))
                                return true;
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
        LatLng dropCoords = mapService.getCoordinates(drop);

        if (pickupCoords == null || dropCoords == null) {
            System.err.println("Could not geocode: " + pickup + " or " + drop);
            return List.of();
        }

        return matchRides(pickupCoords, dropCoords);
    }

    // ── Geo search with direct coords (from frontend) ───────
    public List<Ride> searchRidesByCoords(double pickupLat, double pickupLng,
                                          double dropLat, double dropLng) {
        LatLng pickupCoords = new LatLng(pickupLat, pickupLng);
        LatLng dropCoords = new LatLng(dropLat, dropLng);
        return matchRides(pickupCoords, dropCoords);
    }

    // ── CORE matching logic ──────────────────────────────────
    private List<Ride> matchRides(LatLng pickupCoords, LatLng dropCoords) {
        LocalDate today = LocalDate.now();

        List<Ride> candidates = rideRepository.findValidRidesForRoute(
                pickupCoords.getLat(), pickupCoords.getLng(),
                dropCoords.getLat(), dropCoords.getLng()
        );

        return candidates.stream()
                .filter(r -> r.getAvailableSeats() > 0)
                .filter(r -> {
                    try { return !LocalDate.parse(r.getDate()).isBefore(today); }
                    catch (Exception e) { return false; }
                })
                .filter(r -> {
                    // Skip rides with no polyline — can't do progress check
                    if (r.getPolyline() == null || r.getPolyline().isEmpty()) return false;

                    List<LatLng> route = PolylineUtils.decode(r.getPolyline());

                    double tPickup = PolylineUtils.projectOntoRoute(route, pickupCoords);
                    double tDrop   = PolylineUtils.projectOntoRoute(route, dropCoords);

                    // ── Core order constraint ──────────────────────────────────
                    // pickup must come BEFORE drop on the route, with a minimum
                    // segment (5%) to avoid degenerate near-identical points
                    if (tPickup < 0 || tDrop < 0)        return false;
                    if (tDrop - tPickup < 0.05)           return false; // too short/reversed

                    // ── Proximity guard (still needed) ────────────────────────
                    // Both points must be reasonably near the route, not just
                    // near the start/end endpoints
                    double pickupDistKm = nearestDistToRoute(route, pickupCoords);
                    double dropDistKm   = nearestDistToRoute(route, dropCoords);

                    return pickupDistKm <= MATCH_RADIUS_KM && dropDistKm <= MATCH_RADIUS_KM;
                })
                .map(r -> createPartialRide(r, pickupCoords, dropCoords))
                .toList();
    }

    /** Minimum distance from point to any segment of the route */
    private double nearestDistToRoute(List<LatLng> route, LatLng point) {
        double minDist = Double.MAX_VALUE;
        for (int i = 0; i < route.size() - 1; i++) {
            LatLng p1 = route.get(i);
            LatLng p2 = route.get(i + 1);
            double dx = p2.getLng() - p1.getLng();
            double dy = p2.getLat() - p1.getLat();
            double segLen2 = dx * dx + dy * dy;
            double t = segLen2 > 0
                    ? Math.max(0, Math.min(1,
                    ((point.getLng() - p1.getLng()) * dx
                            + (point.getLat() - p1.getLat()) * dy) / segLen2))
                    : 0;
            LatLng proj = new LatLng(
                    p1.getLat() + t * dy,
                    p1.getLng() + t * dx
            );
            minDist = Math.min(minDist, PolylineUtils.haversineKm(point, proj));
        }
        return minDist;
    }

    /**
     * Builds a detached Ride object safe to return in the API response.
     *
     * Rules:
     *  - startLocation / endLocation → driver's REAL origin/destination (for display)
     *  - fromLat/fromLng/toLat/toLng → driver's REAL route endpoints (for map polyline)
     *  - pickupLat/pickupLng/dropLat/dropLng → user's requested board/alight point
     *  - price → prorated by partial distance / full distance ratio
     *  - isPartial → always true (caller requested a mid-route segment)
     */
    private Ride createPartialRide(Ride r, LatLng pickup, LatLng drop) {
        Ride partial = new Ride();

        // Identity & driver
        partial.setId(r.getId());
        partial.setDriver(r.getDriver());

        // Schedule
        partial.setDate(r.getDate());
        partial.setTime(r.getTime());
        partial.setEndTime(r.getEndTime());

        // Capacity & vehicle
        partial.setAvailableSeats(r.getAvailableSeats());
        partial.setCarType(r.getCarType());
        partial.setCarModel(r.getCarModel());
        partial.setGenderPreference(r.getGenderPreference());
        partial.setNote(r.getNote());
        partial.setStatus(r.getStatus());

        // Route display — keep ORIGINAL driver route, never overwrite with user coords
        partial.setStartLocation(r.getStartLocation());
        partial.setEndLocation(r.getEndLocation());
        partial.setPolyline(r.getPolyline());
        partial.setDistance(r.getDistance());

        // Driver's real geo endpoints (used to draw full polyline on map)
        partial.setFromLat(r.getFromLat());
        partial.setFromLng(r.getFromLng());
        partial.setToLat(r.getToLat());
        partial.setToLng(r.getToLng());

        // User's requested board/alight points (frontend uses these to show
        // pickup pin and drop pin, separate from the driver's route endpoints)
        partial.setPickupLat(pickup.getLat());
        partial.setPickupLng(pickup.getLng());
        partial.setDropLat(drop.getLat());
        partial.setDropLng(drop.getLng());

        partial.setIsPartial(true);

        // Prorated price: partial haversine distance / full route distance
        double totalDist = r.getDistance();
        double partialDist = PolylineUtils.haversineKm(pickup, drop);
        double ratio = (totalDist > 0) ? (partialDist / totalDist) : 1.0;
        ratio = Math.max(0.1, Math.min(1.0, ratio));
        partial.setPrice((double) Math.round(r.getPrice() * ratio));

        return partial;
    }

    // ── Calculate partial fare ───────────────────────────────
    public Map<String, Object> calculatePrice(Long rideId,
                                              Double pickupLat, Double pickupLng,
                                              Double dropLat, Double dropLng) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        double fullPrice = ride.getPrice();
        double fullDistance = ride.getDistance();

        if (fullDistance <= 0 || pickupLat == null || pickupLng == null
                || dropLat == null || dropLng == null) {
            return Map.of(
                    "fullPrice", fullPrice,
                    "calculatedPrice", fullPrice,
                    "partialDistance", 0.0,
                    "fullDistance", fullDistance,
                    "isPartial", false
            );
        }

        LatLng pickupCoords = new LatLng(pickupLat, pickupLng);
        LatLng dropCoords = new LatLng(dropLat, dropLng);

        LatLng rideFrom = new LatLng(ride.getFromLat(), ride.getFromLng());
        LatLng rideTo = new LatLng(ride.getToLat(), ride.getToLng());

        double pickupFromStart = PolylineUtils.haversineKm(pickupCoords, rideFrom);
        double dropFromEnd = PolylineUtils.haversineKm(dropCoords, rideTo);

        if (pickupFromStart <= 3.0 && dropFromEnd <= 3.0) {
            return Map.of(
                    "fullPrice", fullPrice,
                    "calculatedPrice", fullPrice,
                    "partialDistance", fullDistance,
                    "fullDistance", fullDistance,
                    "isPartial", false
            );
        }

        double partialDistance = PolylineUtils.haversineKm(pickupCoords, dropCoords);
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
                "fullPrice", fullPrice,
                "calculatedPrice", calculatedPrice,
                "partialDistance", Math.round(partialDistance * 10.0) / 10.0,
                "fullDistance", Math.round(fullDistance * 10.0) / 10.0,
                "isPartial", true
        );
    }
}