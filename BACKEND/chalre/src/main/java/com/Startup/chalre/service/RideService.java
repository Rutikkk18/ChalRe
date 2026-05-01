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
    // 🔥 NOW returns List<Map> with calculatedPrice + isPartial embedded — NO extra API calls needed
    public List<Map<String, Object>> searchRidesByRoute(String pickup, String drop, String date) {
        LatLng pickupCoords = mapService.getCoordinates(pickup);
        LatLng dropCoords = mapService.getCoordinates(drop);

        if (pickupCoords == null || dropCoords == null) {
            System.err.println("Could not geocode: " + pickup + " or " + drop);
            return List.of();
        }

        List<Ride> rides = matchRides(pickupCoords, dropCoords, date);
        return attachPriceToRides(rides, pickupCoords, dropCoords);
    }

    // ── Geo search with direct coords (from frontend) ───────
    // 🔥 NOW returns List<Map> with calculatedPrice + isPartial embedded — NO extra API calls needed
    public List<Map<String, Object>> searchRidesByCoords(double pickupLat, double pickupLng,
                                                         double dropLat, double dropLng, String date) {
        LatLng pickupCoords = new LatLng(pickupLat, pickupLng);
        LatLng dropCoords = new LatLng(dropLat, dropLng);
        List<Ride> rides = matchRides(pickupCoords, dropCoords, date);
        return attachPriceToRides(rides, pickupCoords, dropCoords);
    }

    // ── 🔥 Attach calculatedPrice + isPartial to each ride in-place ──
    private List<Map<String, Object>> attachPriceToRides(List<Ride> rides, LatLng pickupCoords, LatLng dropCoords) {
        return rides.stream().map(ride -> {
            Map<String, Object> rideMap = new HashMap<>();

            // Embed all ride fields at the top level so frontend can use ride.calculatedPrice etc.
            rideMap.put("id", ride.getId());
            rideMap.put("startLocation", ride.getStartLocation());
            rideMap.put("endLocation", ride.getEndLocation());
            rideMap.put("date", ride.getDate());
            rideMap.put("time", ride.getTime());
            rideMap.put("endTime", ride.getEndTime());
            rideMap.put("availableSeats", ride.getAvailableSeats());
            rideMap.put("price", ride.getPrice());
            rideMap.put("carModel", ride.getCarModel());
            rideMap.put("carType", ride.getCarType());
            rideMap.put("genderPreference", ride.getGenderPreference());
            rideMap.put("note", ride.getNote());
            rideMap.put("status", ride.getStatus());
            rideMap.put("driver", ride.getDriver());
            rideMap.put("polyline", ride.getPolyline());
            rideMap.put("distance", ride.getDistance());
            rideMap.put("fromLat", ride.getFromLat());
            rideMap.put("fromLng", ride.getFromLng());
            rideMap.put("toLat", ride.getToLat());
            rideMap.put("toLng", ride.getToLng());
            rideMap.put("pickupLat", ride.getPickupLat());
            rideMap.put("pickupLng", ride.getPickupLng());
            rideMap.put("dropLat", ride.getDropLat());
            rideMap.put("dropLng", ride.getDropLng());

            // 🔥 CALL EXISTING calculatePrice logic — NO extra HTTP call, all in-memory
            try {
                Map<String, Object> priceData = calculatePrice(
                        ride.getId(),
                        pickupCoords.getLat(), pickupCoords.getLng(),
                        dropCoords.getLat(), dropCoords.getLng()
                );
                rideMap.put("calculatedPrice", priceData.get("calculatedPrice"));
                rideMap.put("fullPrice", priceData.get("fullPrice"));
                rideMap.put("isPartial", priceData.get("isPartial"));
                rideMap.put("partialDistance", priceData.get("partialDistance"));
                rideMap.put("fullDistance", priceData.get("fullDistance"));
            } catch (Exception e) {
                // Fallback: use ride's full price if price calc fails
                rideMap.put("calculatedPrice", ride.getPrice());
                rideMap.put("fullPrice", ride.getPrice());
                rideMap.put("isPartial", false);
                rideMap.put("partialDistance", ride.getDistance());
                rideMap.put("fullDistance", ride.getDistance());
                System.err.println("Price calc failed for ride " + ride.getId() + ": " + e.getMessage());
            }

            return rideMap;
        }).toList();
    }

    // ── CORE matching logic — PostGIS handles proximity + order ──
    private List<Ride> matchRides(LatLng pickupCoords, LatLng dropCoords, String date) {
        LocalDate today = LocalDate.now();

        List<Ride> candidates = rideRepository.findValidRidesForRoute(
                pickupCoords.getLat(), pickupCoords.getLng(),
                dropCoords.getLat(), dropCoords.getLng()
        );

        List<Ride> filtered = new ArrayList<>();

        for (Ride r : candidates) {

            // basic filters
            if (r.getAvailableSeats() <= 0) continue;

            try {
                LocalDate rideDate = LocalDate.parse(r.getDate());

                // ❌ skip past rides
                if (rideDate.isBefore(today)) continue;

                // 🔥 STRICT DATE MATCH (FIX)
                if (date != null && !date.isEmpty()) {
                    LocalDate searchDate = LocalDate.parse(date);
                    if (!rideDate.equals(searchDate)) continue;
                }

            } catch (Exception e) {
                continue;
            }

            // skip if no polyline
            if (r.getPolyline() == null) continue;

            List<LatLng> route = PolylineUtils.decode(r.getPolyline());

            if (route.size() < 2) continue;

            // 🔥 dynamic radius based on route length
            double routeLength = PolylineUtils.calculateRouteLength(route);
            double dynamicRadius = PolylineUtils.getDynamicRadiusKm(routeLength);

            // 🔥 distance from route (STRICT FILTER)
            double pickupDist = PolylineUtils.distanceToRoute(route, pickupCoords);
            double dropDist = PolylineUtils.distanceToRoute(route, dropCoords);

            System.out.println("---- DEBUG ----");
            System.out.println("pickupDist: " + pickupDist);
            System.out.println("dropDist: " + dropDist);
            System.out.println("dynamicRadius: " + dynamicRadius);
            System.out.println("routeLength: " + routeLength);

            if (pickupDist > dynamicRadius) continue;
            if (dropDist > dynamicRadius) continue;

            // 🔥 progression check again (extra safety)
            double pickupProg = PolylineUtils.projectOntoRoute(route, pickupCoords);
            double dropProg = PolylineUtils.projectOntoRoute(route, dropCoords);

            if (pickupProg < 0 || dropProg < 0) continue;
            if (pickupProg >= dropProg) continue;
            if ((dropProg - pickupProg) < 0.01) continue;

            // 🔥 OPTIONAL but VERY powerful → detour filter
            double directDist = PolylineUtils.haversineKm(pickupCoords, dropCoords);

            // prevents weird long off-route matches

            filtered.add(createPartialRide(r, pickupCoords, dropCoords));
        }

        return filtered;
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

        partial.setId(r.getId());
        partial.setDriver(r.getDriver());

        partial.setDate(r.getDate());
        partial.setTime(r.getTime());
        partial.setEndTime(r.getEndTime());

        partial.setAvailableSeats(r.getAvailableSeats());
        partial.setCarType(r.getCarType());
        partial.setCarModel(r.getCarModel());
        partial.setGenderPreference(r.getGenderPreference());
        partial.setNote(r.getNote());
        partial.setStatus(r.getStatus());

        partial.setStartLocation(r.getStartLocation());
        partial.setEndLocation(r.getEndLocation());
        partial.setPolyline(r.getPolyline());
        partial.setDistance(r.getDistance());

        partial.setFromLat(r.getFromLat());
        partial.setFromLng(r.getFromLng());
        partial.setToLat(r.getToLat());
        partial.setToLng(r.getToLng());

        partial.setPickupLat(pickup.getLat());
        partial.setPickupLng(pickup.getLng());
        partial.setDropLat(drop.getLat());
        partial.setDropLng(drop.getLng());

        partial.setIsPartial(true);

        partial.setPrice(r.getPrice()); // keep full price — calculatedPrice is added separately

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