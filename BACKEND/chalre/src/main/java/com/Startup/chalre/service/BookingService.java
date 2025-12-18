package com.Startup.chalre.service;

import com.Startup.chalre.DTO.BookingDTO;
import com.Startup.chalre.entity.Booking;
import com.Startup.chalre.entity.Ride;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.entity.Wallet;
import com.Startup.chalre.repository.BookingRepository;
import com.Startup.chalre.repository.RideRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final RideRepository rideRepository;
    private final BookingRepository bookingRepository;
    private final WalletService walletService;
    private final NotificationService notificationService;

    /**
     * ATOMIC BOOKING WITH CONCURRENCY SAFE LOCKING
     */
    @Transactional
    public Booking bookRide(BookingDTO dto, User user) {

        // 🔒 Pessimistic locking → prevents double booking
        if (dto.getRideId() == null) {
            throw new RuntimeException("Ride ID is required");
        }
        
        Ride ride = rideRepository.findByIdForUpdate(dto.getRideId())
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        // Validate ride date is not in the past
        try {
            java.time.LocalDate rideDate = java.time.LocalDate.parse(ride.getDate());
            if (rideDate.isBefore(java.time.LocalDate.now())) {
                throw new RuntimeException("Cannot book a ride that has already passed");
            }
        } catch (Exception e) {
            // If date parsing fails, continue (invalid date format)
        }

        // User can’t book own ride
        if (ride.getDriver().getId().equals(user.getId())) {
            throw new RuntimeException("You cannot book your own ride");
        }

        // Check available seats safely inside lock
        if (ride.getAvailableSeats() <= 0) {
            throw new RuntimeException("No seats available for this ride.");
        }

        if (dto.getSeats() > ride.getAvailableSeats()) {
            throw new RuntimeException("Not enough seats available for your request.");
        }

        // Convert price → paise
        long pricePaise = (long) (ride.getPrice() * 100);
        long totalCost = pricePaise * dto.getSeats();

        // ----------------------- PAYMENT HANDLING -----------------------
        if (dto.getPaymentMode().equalsIgnoreCase("WALLET")) {
            // Pre-check wallet balance before processing
            Wallet wallet = walletService.getWallet(user.getId());
            if (wallet.getBalance() < totalCost) {
                throw new RuntimeException("Insufficient wallet balance. Current balance: ₹" + 
                    (wallet.getBalance() / 100.0) + ", Required: ₹" + (totalCost / 100.0));
            }
            walletService.debitForBooking(user.getId(), totalCost);
        }
        // CASH mode → no wallet deduction
        // ----------------------------------------------------------------

        // Create booking - IMMEDIATELY CONFIRMED (no admin approval needed)
        // Driver is already assigned from the ride, so booking is instant
        Booking booking = new Booking();
        booking.setUser(user);
        booking.setRide(ride);
        booking.setSeatsBooked(dto.getSeats());
        booking.setStatus("BOOKED");  // ✅ Booking is immediately confirmed
        booking.setBookingTime(LocalDateTime.now().toString());
        booking.setPaymentMode(dto.getPaymentMode());

        // Payment status (separate from booking status)
        // - WALLET: Payment is immediate, status = PAID
        // - CASH: Payment happens with driver, status = PENDING until driver confirms
        if (dto.getPaymentMode().equalsIgnoreCase("CASH")) {
            booking.setPaymentStatus("PENDING");  // Cash payment pending driver confirmation
        } else {
            booking.setPaymentStatus("PAID");  // Wallet payment immediately paid
        }

        // Reduce seats safely inside lock
        ride.setAvailableSeats(ride.getAvailableSeats() - dto.getSeats());
        rideRepository.save(ride);

        // Save booking
        Booking savedBooking = bookingRepository.save(booking);

        // 🔔 Auto Notification → Booking Confirmed
        notificationService.sendNotification(
                user,
                "Booking Confirmed",
                "Your booking for ride from " + ride.getStartLocation () + " to " + ride.getEndLocation() + " is confirmed.",
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

        // Return seats
        Ride ride = booking.getRide();
        ride.setAvailableSeats(ride.getAvailableSeats() + booking.getSeatsBooked());
        rideRepository.save(ride);

        // Refund wallet if payment was via WALLET and status was PAID
        if ("WALLET".equalsIgnoreCase(booking.getPaymentMode()) 
            && "PAID".equalsIgnoreCase(booking.getPaymentStatus())) {
            
            long pricePaise = (long) (ride.getPrice() * 100);
            long refundAmount = pricePaise * booking.getSeatsBooked();
            
            // Refund to wallet
            walletService.creditForCancellation(user.getId(), refundAmount);
            
            booking.setPaymentStatus("REFUNDED");
        }

        bookingRepository.save(booking);

        // 🔔 Auto Notification → Booking Cancelled
        notificationService.sendNotification(
                user,
                "Booking Cancelled",
                "Your booking has been cancelled." + 
                ("WALLET".equalsIgnoreCase(booking.getPaymentMode()) ? 
                    " Amount refunded to wallet." : ""),
                "BOOKING_CANCELLED",
                Map.of("bookingId", booking.getId().toString())
        );

        return "Booking cancelled successfully";
    }

    public List<Booking> getMyBookings(User user) {
        return bookingRepository.findByUser(user);
    }

    public Map<String, List<Booking>> getMyBookingsSeparated(User user) {
        List<Booking> allBookings = bookingRepository.findByUser(user);
        LocalDate today = LocalDate.now();
        
        List<Booking> upcoming = new ArrayList<>();
        List<Booking> past = new ArrayList<>();
        
        for (Booking booking : allBookings) {
            if (!"BOOKED".equals(booking.getStatus())) {
                past.add(booking);
                continue;
            }
            
            try {
                LocalDate rideDate = LocalDate.parse(booking.getRide().getDate());
                if (rideDate.isBefore(today)) {
                    past.add(booking);
                } else if (rideDate.equals(today) && booking.getRide().getTime() != null && !booking.getRide().getTime().isEmpty()) {
                    try {
                        LocalTime rideTime = LocalTime.parse(booking.getRide().getTime());
                        LocalTime now = LocalTime.now();
                        if (rideTime.isBefore(now)) {
                            past.add(booking);
                        } else {
                            upcoming.add(booking);
                        }
                    } catch (Exception e) {
                        upcoming.add(booking);
                    }
                } else {
                    upcoming.add(booking);
                }
            } catch (Exception e) {
                upcoming.add(booking);
            }
        }
        
        Map<String, List<Booking>> result = new HashMap<>();
        result.put("upcoming", upcoming);
        result.put("past", past);
        return result;
    }
}
