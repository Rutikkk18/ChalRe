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

        // Validate date/time
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

        // ── Geocode + Route (with fallback, never blocks ride creation) ──
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
        // ─────────────────────────────────────────────────────────────────

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

        // ── Save geo data (only if available) ───────────────────────────
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
        // ────────────────────────────────────────────────────────────────

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
                        if (r.getGenderPreference() == null || r.getGenderPreference().isEmpty()) {
                            return true;
                        }
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
                if (rideDate.isBefore(today)) {
                    past.add(ride);
                } else {
                    upcoming.add(ride);
                }
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

    // UPDATE RIDE
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

    // CANCEL RIDE
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

    // DELETE RIDE
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

    // ── Geo-based search (Phase 6 + 7) ──────────────────────
    public List<Ride> searchRidesByRoute(String pickup, String drop) {

        LatLng pickupCoords = mapService.getCoordinates(pickup);
        LatLng dropCoords   = mapService.getCoordinates(drop);

        LocalDate today = LocalDate.now();

        List<Ride> allRides = rideRepository.findAll().stream()
                .filter(r -> r.getPolyline() != null && !r.getPolyline().isEmpty())
                .filter(r -> r.getAvailableSeats() > 0)
                .filter(r -> {
                    try {
                        return !LocalDate.parse(r.getDate()).isBefore(today);
                    } catch (Exception e) {
                        return false;
                    }
                })
                .toList();

        return allRides.stream()
                .filter(r ->
                        PolylineUtils.isPointNearRoute(pickupCoords, r.getPolyline()) &&
                        PolylineUtils.isPointNearRoute(dropCoords,   r.getPolyline())
                )
                .toList();
    }

    // ── Geo search with direct coords ───────────────────────
    public List<Ride> searchRidesByCoords(double pickupLat, double pickupLng,
                                          double dropLat,   double dropLng) {
        LatLng pickupCoords = new LatLng(pickupLat, pickupLng);
        LatLng dropCoords   = new LatLng(dropLat,   dropLng);

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
                .filter(r -> {
                    // ── PRIMARY: polyline-based matching ──
                    if (r.getPolyline() != null && !r.getPolyline().isEmpty()) {
                        return PolylineUtils.isPointNearRoute(pickupCoords, r.getPolyline())
                                && PolylineUtils.isPointNearRoute(dropCoords,   r.getPolyline());
                    }

                    // ── FALLBACK: use stored from/to coords directly ──
                    // If ride has no polyline but has coordinates, check radius from endpoints
                    if (r.getFromLat() != 0 && r.getToLat() != 0) {
                        LatLng rideFrom = new LatLng(r.getFromLat(), r.getFromLng());
                        LatLng rideTo   = new LatLng(r.getToLat(),   r.getToLng());

                        boolean pickupNearStart = PolylineUtils.haversineKm(pickupCoords, rideFrom) <= 5.0;
                        boolean dropNearEnd     = PolylineUtils.haversineKm(dropCoords,   rideTo)   <= 5.0;

                        return pickupNearStart && dropNearEnd;
                    }

                    return false;
                })
                .toList();
    }
}