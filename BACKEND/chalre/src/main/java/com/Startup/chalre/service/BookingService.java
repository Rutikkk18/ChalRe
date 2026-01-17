package com.Startup.chalre.service;

import com.Startup.chalre.DTO.BookingDTO;
import com.Startup.chalre.entity.Booking;
import com.Startup.chalre.entity.Ride;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.repository.BookingRepository;
import com.Startup.chalre.repository.RideRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final RideRepository rideRepository;
    private final BookingRepository bookingRepository;
    private final NotificationService notificationService;

    /**
     * ATOMIC BOOKING WITH CONCURRENCY SAFE LOCKING
     */
    @Transactional
    public Booking bookRide(BookingDTO dto, User user) {

        if (dto.getRideId() == null) {
            throw new RuntimeException("Ride ID is required");
        }

        Ride ride = rideRepository.findByIdForUpdate(dto.getRideId())
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        // Validate ride date
        try {
            LocalDate rideDate = LocalDate.parse(ride.getDate());
            if (rideDate.isBefore(LocalDate.now())) {
                throw new RuntimeException("Cannot book a ride that has already passed");
            }
        } catch (Exception ignored) {}

        // User can’t book own ride
        if (ride.getDriver().getId().equals(user.getId())) {
            throw new RuntimeException("You cannot book your own ride");
        }

        // Seat validation
        if (ride.getAvailableSeats() <= 0) {
            throw new RuntimeException("No seats available for this ride.");
        }

        if (dto.getSeats() > ride.getAvailableSeats()) {
            throw new RuntimeException("Not enough seats available for your request.");
        }

        // Validate payment method
        if (dto.getPaymentMethod() == null ||
                (!dto.getPaymentMethod().equalsIgnoreCase("CASH")
                        && !dto.getPaymentMethod().equalsIgnoreCase("ONLINE"))) {
            throw new RuntimeException("Invalid payment method. Use CASH or ONLINE.");
        }

        // ONLINE → txnId mandatory
        if ("ONLINE".equalsIgnoreCase(dto.getPaymentMethod())) {
            if (dto.getTxnId() == null || dto.getTxnId().isBlank()) {
                throw new RuntimeException("Transaction ID required for online payment");
            }
        }

        // ----------------------- BOOKING CREATION -----------------------

        Booking booking = new Booking();
        booking.setUser(user);
        booking.setRide(ride);
        booking.setSeatsBooked(dto.getSeats());
        booking.setStatus("BOOKED");
        booking.setBookingTime(LocalDateTime.now().toString());
        booking.setPaymentMethod(dto.getPaymentMethod()); // ✅ FIXED

        if ("ONLINE".equalsIgnoreCase(dto.getPaymentMethod())) {
            booking.setPaymentStatus("PAID");
            booking.setTxnId(dto.getTxnId()); // store UPI txn id
        } else {
            booking.setPaymentStatus("PENDING");
        }

        // Reduce seats
        ride.setAvailableSeats(ride.getAvailableSeats() - dto.getSeats());
        rideRepository.save(ride);

        Booking savedBooking = bookingRepository.save(booking);

        // 🔔 Booking Confirmed
        notificationService.sendNotification(
                user,
                "Booking Confirmed",
                "Your booking for ride from " + ride.getStartLocation() +
                        " to " + ride.getEndLocation() + " is confirmed.",
                "BOOKING_CONFIRMED",
                Map.of(
                        "bookingId", savedBooking.getId().toString(),
                        "rideId", ride.getId().toString()
                )
        );

        return savedBooking;
    }

    // -------------------------------------------------------------

    @Transactional
    public String cancelBooking(Long bookingId, User user) {

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!booking.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("This is not your booking");
        }

        if (!booking.getStatus().equals("BOOKED")) {
            throw new RuntimeException("Booking already cancelled");
        }

        booking.setStatus("CANCELLED");

        Ride ride = booking.getRide();
        ride.setAvailableSeats(ride.getAvailableSeats() + booking.getSeatsBooked());
        rideRepository.save(ride);

        if ("PAID".equalsIgnoreCase(booking.getPaymentStatus())) {
            booking.setPaymentStatus("REFUNDED");
        }

        bookingRepository.save(booking);

        notificationService.sendNotification(
                user,
                "Booking Cancelled",
                "Your booking has been cancelled.",
                "BOOKING_CANCELLED",
                Map.of("bookingId", booking.getId().toString())
        );

        return "Booking cancelled successfully";
    }

    // -------------------------------------------------------------

    public List<Booking> getMyBookings(User user) {
        return bookingRepository.findByUser(user);
    }

    public Map<String, List<Booking>> getMyBookingsSeparated(User user) {

    List<Booking> allBookings = bookingRepository.findByUser(user);
    LocalDate today = LocalDate.now();

    List<Booking> upcoming = new ArrayList<>();
    List<Booking> past = new ArrayList<>();

    for (Booking booking : allBookings) {

        // CANCELLED bookings always go to PAST
        if (!"BOOKED".equals(booking.getStatus())) {
            past.add(booking);
            continue;
        }

        try {
            LocalDate rideDate = LocalDate.parse(booking.getRide().getDate());

            // If ride date is before today → PAST
            if (rideDate.isBefore(today)) {
                past.add(booking);
            } 
            // If ride date is today or future → UPCOMING
            else {
                upcoming.add(booking);
            }

        } catch (Exception e) {
            // If date parsing fails, consider it upcoming (safer default)
            upcoming.add(booking);
        }
    }

    Map<String, List<Booking>> result = new HashMap<>();
    result.put("upcoming", upcoming);
    result.put("past", past);
    return result;

    }
}
