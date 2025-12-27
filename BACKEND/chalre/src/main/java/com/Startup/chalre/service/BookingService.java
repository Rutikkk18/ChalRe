package com.Startup.chalre.service;

import com.Startup.chalre.DTO.BookingDTO;
import com.Startup.chalre.entity.Booking;
import com.Startup.chalre.entity.Payment;
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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final RideRepository rideRepository;
    private final BookingRepository bookingRepository;
    private final PaymentService paymentService;
    private final NotificationService notificationService;
    private final DriverEarningsService driverEarningsService;

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

        // Validate payment method
        if (dto.getPaymentMethod() == null || 
            (!dto.getPaymentMethod().equalsIgnoreCase("CASH") && 
             !dto.getPaymentMethod().equalsIgnoreCase("ONLINE"))) {
            throw new RuntimeException("Invalid payment method. Use CASH or ONLINE.");
        }

        // ----------------------- PAYMENT VALIDATION -----------------------
        Payment payment = null;
        
        if ("ONLINE".equalsIgnoreCase(dto.getPaymentMethod())) {
            // ONLINE payment: paymentId is required and must be SUCCESS
            if (dto.getPaymentId() == null) {
                throw new RuntimeException("Payment ID is required for ONLINE payment. Please initiate payment first.");
            }
            
            payment = paymentService.getPayment(dto.getPaymentId());
            
            // Verify payment belongs to user
            if (!payment.getUser().getId().equals(user.getId())) {
                throw new RuntimeException("Payment does not belong to this user");
            }
            
            // Verify payment is for this ride
            if (!payment.getRide().getId().equals(ride.getId())) {
                throw new RuntimeException("Payment is not for this ride");
            }
            
            // Verify payment amount matches
            if (!payment.getAmount().equals(totalCost)) {
                throw new RuntimeException("Payment amount does not match booking cost");
            }
            
            // Verify payment status is SUCCESS
            if (payment.getStatus() != Payment.PaymentStatus.SUCCESS) {
                throw new RuntimeException("Payment must be successful before booking. Current status: " + payment.getStatus());
            }
        }
        // CASH payment: no paymentId required, payment happens with driver
        // ----------------------------------------------------------------

        // Create booking - IMMEDIATELY CONFIRMED (no admin approval needed)
        // Driver is already assigned from the ride, so booking is instant
        Booking booking = new Booking();
        booking.setUser(user);
        booking.setRide(ride);
        booking.setSeatsBooked(dto.getSeats());
        booking.setStatus("BOOKED");  // ✅ Booking is immediately confirmed
        booking.setBookingTime(LocalDateTime.now().toString());
        booking.setPaymentMethod(dto.getPaymentMethod());
        booking.setPayment(payment); // Link to payment (null for CASH)
        
        // Set payment status based on payment method
        if ("ONLINE".equalsIgnoreCase(dto.getPaymentMethod())) {
            booking.setPaymentStatus("PAID"); // Online payment is already paid
        } else {
            booking.setPaymentStatus("PENDING"); // Cash payment pending driver confirmation
        }

        // Reduce seats safely inside lock
        ride.setAvailableSeats(ride.getAvailableSeats() - dto.getSeats());
        rideRepository.save(ride);

        // Save booking
        Booking savedBooking = bookingRepository.save(booking);

        // 💰 Add driver earnings if ONLINE payment was successful
        if ("ONLINE".equalsIgnoreCase(dto.getPaymentMethod()) && payment != null) {
            try {
                User driver = ride.getDriver();
                driverEarningsService.addEarnings(driver, payment.getAmount());
                
                // 🔔 Notification to driver about earnings
                notificationService.sendNotification(
                        driver,
                        "New Earnings",
                        "You earned ₹" + ((payment.getAmount() - (long)(payment.getAmount() * 0.10)) / 100.0) + 
                        " from a booking (₹" + (payment.getAmount() / 100.0) + " - 10% commission).",
                        "EARNINGS_ADDED",
                        Map.of(
                                "bookingId", savedBooking.getId().toString(),
                                "rideId", ride.getId().toString(),
                                "amount", payment.getAmount().toString()
                        )
                );
            } catch (Exception e) {
                // Log error but don't fail the booking
                org.slf4j.LoggerFactory.getLogger(BookingService.class)
                        .error("Failed to add driver earnings for booking: " + savedBooking.getId(), e);
            }
        }

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

        // Mark payment as refunded if payment was PAID
        if ("PAID".equalsIgnoreCase(booking.getPaymentStatus())) {
            booking.setPaymentStatus("REFUNDED");
            // Note: Actual refund processing would be handled by payment gateway/webhook
            // For now, we just mark the booking payment status as REFUNDED
        }

        bookingRepository.save(booking);

        // 🔔 Auto Notification → Booking Cancelled
        notificationService.sendNotification(
                user,
                "Booking Cancelled",
                "Your booking has been cancelled. Refund will be processed.",
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
