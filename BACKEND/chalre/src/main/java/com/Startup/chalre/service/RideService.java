package com.Startup.chalre.service;

import com.Startup.chalre.DTO.RideDTO;
import com.Startup.chalre.DTO.RideUpdateDTO;
import com.Startup.chalre.entity.Booking;
import com.Startup.chalre.entity.Ride;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.repository.BookingRepository;
import com.Startup.chalre.repository.RideRepository;
import com.Startup.chalre.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import jakarta.transaction.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class RideService {

    private final RideRepository rideRepository;
    private final NotificationService notificationService;
    private final BookingRepository bookingRepository;

    // CREATE RIDE
    public Ride createRide(RideDTO dto, User driver) {
        // Validate date and time - no past rides
        try {
            LocalDate rideDate = LocalDate.parse(dto.getDate());
            LocalDate today = LocalDate.now();
            
            if (rideDate.isBefore(today)) {
                throw new RuntimeException("Cannot create a ride in the past");
            }
            
            // If ride is today, validate time is in the future
            if (rideDate.equals(today) && dto.getTime() != null && !dto.getTime().isEmpty()) {
                try {
                    LocalTime rideTime = LocalTime.parse(dto.getTime());
                    LocalTime now = LocalTime.now();
                    
                    if (rideTime.isBefore(now)) {
                        throw new RuntimeException("Cannot create a ride with past time for today");
                    }
                } catch (Exception e) {
                    // If time parsing fails, continue (invalid format will be caught elsewhere)
                }
            }
        } catch (Exception e) {
            if (e instanceof RuntimeException) {
                throw e;
            }
            // If date parsing fails, continue (invalid format will be caught elsewhere)
        }
        
        Ride ride = new Ride();
        ride.setStartLocation(dto.getStartLocation());
        ride.setEndLocation(dto.getEndLocation());
        ride.setDate(dto.getDate());
        ride.setTime(dto.getTime());
        ride.setAvailableSeats(dto.getAvailableSeats());
        ride.setPrice(dto.getPrice());
        ride.setCarModel(dto.getCarModel());
        ride.setCarType(dto.getCarType());
        ride.setGenderPreference(dto.getGenderPreference());
        ride.setNote(dto.getNote());
        ride.setDriver(driver);

        Ride saved = rideRepository.save(ride);

        // 🔔 NOTIFICATION
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
    rideRepository.findByStatus("ACTIVE");

        return rideRepository.findAll().stream()
            .filter(ride -> ride.getAvailableSeats() > 0)

            .filter(ride -> {
                try {
                    LocalDate rideDate = LocalDate.parse(ride.getDate());
                    return !rideDate.isBefore(today); // Show today and future dates
                } catch (Exception e) {
                    return false; // If date parsing fails, hide the ride
                }
            })
            .toList();
}

    public List<Ride> searchRides(String from, String to, String date, Integer seats, 
                                   Double minPrice, Double maxPrice, String carType, 
                                   String genderPreference, String userGender) {

        List<Ride> rides = rideRepository
                .findByStartLocationIgnoreCaseAndEndLocationIgnoreCase(from, to)
                .stream()

                .filter(ride -> ride.getAvailableSeats() > 0)
                .toList();

        LocalDate today = LocalDate.now();

        rides = rides.stream()
                .filter(ride -> {
                    LocalDate rideDate = LocalDate.parse(ride.getDate());
                    return !rideDate.isBefore(today);
                })
                .toList();



        if (date != null && !date.isEmpty()) {
            rides = rides.stream()
                    .filter(r -> r.getDate().equals(date))
                    .toList();
        }

        if (seats != null) {
            rides = rides.stream()
                    .filter(r -> r.getAvailableSeats() >= seats)
                    .toList();
        }

        // Price filter
        if (minPrice != null) {
            rides = rides.stream()
                    .filter(r -> r.getPrice() >= minPrice)
                    .toList();
        }
        if (maxPrice != null) {
            rides = rides.stream()
                    .filter(r -> r.getPrice() <= maxPrice)
                    .toList();
        }

        // Car type filter
        if (carType != null && !carType.isEmpty()) {
            rides = rides.stream()
                    .filter(r -> r.getCarType() != null && r.getCarType().equalsIgnoreCase(carType))
                    .toList();
        }

        // Gender preference filter
        if (genderPreference != null && !genderPreference.isEmpty()) {
            rides = rides.stream()
                    .filter(r -> {
                        // If ride has no gender preference, show it
                        if (r.getGenderPreference() == null || r.getGenderPreference().isEmpty()) {
                            return true;
                        }
                        // If user gender matches ride preference
                        if (userGender != null && !userGender.isEmpty()) {
                            if (r.getGenderPreference().equals("MALE_ONLY") && userGender.equals("MALE")) {
                                return true;
                            }
                            if (r.getGenderPreference().equals("FEMALE_ONLY") && userGender.equals("FEMALE")) {
                                return true;
                            }
                            // If ride has preference but user doesn't match, hide it
                            return false;
                        }
                        // If no user gender provided, show all rides
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
            
            // If ride date is before today → PAST
            if (rideDate.isBefore(today)) {
                past.add(ride);
            } 
            // If ride date is today or future → UPCOMING
            else {
                upcoming.add(ride);
            }
        } catch (Exception e) {
            // If date parsing fails, consider it upcoming (safer default)
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

        // Validate date and time if being updated
        String newDate = dto.getDate() != null ? dto.getDate() : ride.getDate();
        String newTime = dto.getTime() != null ? dto.getTime() : ride.getTime();
        
        try {
            LocalDate rideDate = LocalDate.parse(newDate);
            LocalDate today = LocalDate.now();
            
            if (rideDate.isBefore(today)) {
                throw new RuntimeException("Cannot update ride to a past date");
            }
            
            // If ride is today, validate time is in the future
            if (rideDate.equals(today) && newTime != null && !newTime.isEmpty()) {
                try {
                    LocalTime rideTime = LocalTime.parse(newTime);
                    LocalTime now = LocalTime.now();
                    
                    if (rideTime.isBefore(now)) {
                        throw new RuntimeException("Cannot update ride to a past time for today");
                    }
                } catch (Exception e) {
                    // If time parsing fails, continue
                }
            }
        } catch (Exception e) {
            if (e instanceof RuntimeException) {
                throw e;
            }
        }

        if (dto.getStartLocation() != null) ride.setStartLocation(dto.getStartLocation());
        if (dto.getEndLocation() != null) ride.setEndLocation(dto.getEndLocation());
        if (dto.getDate() != null) ride.setDate(dto.getDate());
        if (dto.getTime() != null) ride.setTime(dto.getTime());
        if (dto.getAvailableSeats() != null) ride.setAvailableSeats(dto.getAvailableSeats());
        if (dto.getPrice() != null) ride.setPrice(dto.getPrice());
        if (dto.getCarModel() != null) ride.setCarModel(dto.getCarModel());
        if (dto.getCarType() != null) ride.setCarType(dto.getCarType());
        if (dto.getGenderPreference() != null) ride.setGenderPreference(dto.getGenderPreference());
        if (dto.getNote() != null) ride.setNote(dto.getNote());

        Ride updated = rideRepository.save(ride);

        // 🔔 NOTIFICATION
        notificationService.sendNotification(
                driver,
                "Ride Updated",
                "Your ride has been updated successfully.",
                "RIDE_UPDATED",
                Map.of("rideId", ride.getId().toString())
        );

        return updated;
    }

    // CANCEL RIDE (Driver) - Refunds all passengers
    @Transactional
    public String cancelRide(Long rideId, User driver) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        if (!ride.getDriver().getId().equals(driver.getId())) {
            throw new RuntimeException("You are not the owner of this ride");
        }

        // Get all bookings for this ride
        List<Booking> bookings = bookingRepository.findByRide(ride);
        
        int refundedCount = 0;
        int totalRefundAmount = 0;

        // Cancel all bookings and refund passengers
        for (Booking booking : bookings) {
            if ("BOOKED".equals(booking.getStatus())) {
                // Cancel the booking
                booking.setStatus("CANCELLED");

                // Mark payment as refunded if payment was PAID
                if ("PAID".equalsIgnoreCase(booking.getPaymentStatus())) {
                    long pricePaise = (long) (ride.getPrice() * 100);
                    long refundAmount = pricePaise * booking.getSeatsBooked();
                    
                    booking.setPaymentStatus("REFUNDED");
                    refundedCount++;
                    totalRefundAmount += refundAmount;
                    // Note: Actual refund processing would be handled by payment gateway/webhook
                }

                bookingRepository.save(booking);

                // 🔔 Notify passenger
                notificationService.sendNotification(
                        booking.getUser(),
                        "Ride Cancelled by Driver",
                        "The ride from " + ride.getStartLocation() + " to " + ride.getEndLocation() + 
                        " has been cancelled by the driver. Refund will be processed.",
                        "RIDE_CANCELLED_BY_DRIVER",
                        Map.of(
                                "rideId", ride.getId().toString(),
                                "bookingId", booking.getId().toString()
                        )
                );
            }
        }

        // Mark ride as cancelled instead of deleting
        ride.setStatus("CANCELLED");
        rideRepository.save(ride);

        // 🔔 Notify driver
        notificationService.sendNotification(
                driver,
                "Ride Cancelled",
                "Your ride has been cancelled. " + refundedCount + " passenger(s) refunded.",
                "RIDE_CANCELLED",
                Map.of("rideId", rideId.toString())
        );

        return "Ride cancelled successfully. " + refundedCount + " passenger(s) refunded.";
    }

    // DELETE RIDE (Hard delete - use cancelRide instead if there are bookings)
    @Transactional
    public String deleteRide(Long rideId, User driver) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        if (!ride.getDriver().getId().equals(driver.getId())) {
            throw new RuntimeException("You are not the owner of this ride");
        }

        // Check if there are any bookings
        List<Booking> bookings = bookingRepository.findByRide(ride);
        boolean hasActiveBookings = bookings.stream()
                .anyMatch(b -> "BOOKED".equals(b.getStatus()));

        if (hasActiveBookings) {
            throw new RuntimeException("Cannot delete ride with active bookings. Please cancel the ride instead.");
        }

        rideRepository.delete(ride);

        // 🔔 NOTIFICATION
        notificationService.sendNotification(
                driver,
                "Ride Deleted",
                "Your ride from " + ride.getStartLocation() + " to " + ride.getEndLocation() + " has been deleted.",
                "RIDE_DELETED",
                Map.of("rideId", rideId.toString())
        );

        return "Ride deleted successfully";
    }

}
