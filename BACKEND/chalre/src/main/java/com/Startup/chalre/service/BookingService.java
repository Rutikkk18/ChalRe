package com.Startup.chalre.service;

import com.Startup.chalre.DTO.BookingDTO;
import com.Startup.chalre.DTO.BookingSummaryDTO;
import com.Startup.chalre.entity.Booking;
import com.Startup.chalre.entity.Ride;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.repository.BookingRepository;
import com.Startup.chalre.repository.PaymentRepository;
import com.Startup.chalre.repository.RideRepository;
import com.Startup.chalre.entity.Payment;
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
    private final PaymentRepository paymentRepository;

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
            if (rideDate.isBefore(LocalDate.now(java.time.ZoneId.of("Asia/Kolkata")))) {
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

        // 🔔 Notify passenger — booking confirmed
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

        // 🔔 Notify driver — new booking received
        notificationService.sendNotification(
                ride.getDriver(),
                "New Booking Received",
                (user.getName() != null ? user.getName() : "A passenger") +
                        " booked " + dto.getSeats() + " seat(s) on your ride from " +
                        ride.getStartLocation() + " to " + ride.getEndLocation() + ".",
                "NEW_BOOKING",
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
            if (booking.getTxnId() != null && !booking.getTxnId().isEmpty()) {
                paymentRepository.findByRazorpayPaymentId(booking.getTxnId())
                        .ifPresent(payment -> {
                            payment.setStatus(Payment.PaymentStatus.REFUNDED);
                            paymentRepository.save(payment);
                        });
            }
        }

        bookingRepository.save(booking);

        // 🔔 Notify passenger — their booking was cancelled
        notificationService.sendNotification(
                user,
                "Booking Cancelled",
                "Your booking has been cancelled.",
                "BOOKING_CANCELLED",
                Map.of("bookingId", booking.getId().toString())
        );

        // 🔔 Notify driver — a passenger cancelled
        notificationService.sendNotification(
                ride.getDriver(),
                "Booking Cancelled by Passenger",
                (user.getName() != null ? user.getName() : "A passenger") +
                        " cancelled their booking on your ride from " +
                        ride.getStartLocation() + " to " + ride.getEndLocation() + ".",
                "BOOKING_CANCELLED_BY_PASSENGER",
                Map.of(
                        "bookingId", booking.getId().toString(),
                        "rideId", ride.getId().toString()
                )
        );

        return "Booking cancelled successfully";
    }

    // -------------------------------------------------------------

    public List<Booking> getMyBookings(User user) {
        return bookingRepository.findByUser(user);
    }

    public Map<String, List<BookingSummaryDTO>> getMyBookingsSeparated(User user) {

        List<Booking> allBookings = bookingRepository.findByUser(user);
        LocalDate today = LocalDate.now(java.time.ZoneId.of("Asia/Kolkata"));

        List<BookingSummaryDTO> upcoming = new ArrayList<>();
        List<BookingSummaryDTO> past     = new ArrayList<>();

        for (Booking booking : allBookings) {
            // Skip orphaned bookings (ride was deleted)
            if (booking.getRide() == null) continue;

            BookingSummaryDTO dto = toBookingSummaryDTO(booking);

            // CANCELLED / COMPLETED bookings always go to PAST
            if (!"BOOKED".equals(booking.getStatus())) {
                past.add(dto);
                continue;
            }

            try {
                LocalDate rideDate = LocalDate.parse(booking.getRide().getDate());
                // If ride date is before today → PAST
                if (rideDate.isBefore(today)) past.add(dto);
                // If ride date is today or future → UPCOMING
                else                          upcoming.add(dto);
            } catch (Exception e) {
                // If date parsing fails, consider it upcoming (safer default)
                upcoming.add(dto);
            }
        }

        // Sort upcoming ascending (closest first)
        upcoming.sort((b1, b2) -> compareSummaryBookings(b1, b2));
        // Sort past descending (most recent first)
        past.sort((b1, b2)     -> compareSummaryBookings(b2, b1));

        Map<String, List<BookingSummaryDTO>> result = new HashMap<>();
        result.put("upcoming", upcoming);
        result.put("past",     past);
        return result;
    }

    /** Maps a full Booking entity to the lightweight BookingSummaryDTO. */
    private BookingSummaryDTO toBookingSummaryDTO(Booking booking) {
        Ride ride = booking.getRide();

        BookingSummaryDTO.DriverInfo driverInfo = null;
        if (ride.getDriver() != null) {
            driverInfo = new BookingSummaryDTO.DriverInfo(
                    ride.getDriver().getId(),
                    ride.getDriver().getName(),
                    ride.getDriver().getPhone()  // required by BookingSuccess.jsx click-to-call
            );
        }

        BookingSummaryDTO.RideInfo rideInfo = new BookingSummaryDTO.RideInfo(
                ride.getId(),
                ride.getStartLocation(),
                ride.getEndLocation(),
                ride.getDate(),
                ride.getTime(),
                ride.getPrice(),
                driverInfo
        );

        return new BookingSummaryDTO(
                booking.getId(),
                booking.getStatus(),
                booking.getPaymentStatus(),
                booking.getPaymentMethod(),
                booking.getSeatsBooked(),
                rideInfo
        );
    }

    /** Comparator for BookingSummaryDTO by ride date + time (ascending). */
    private int compareSummaryBookings(BookingSummaryDTO b1, BookingSummaryDTO b2) {
        if (b1.getRide() == null && b2.getRide() == null) return 0;
        if (b1.getRide() == null) return 1;
        if (b2.getRide() == null) return -1;
        String date1 = b1.getRide().getDate() != null ? b1.getRide().getDate() : "";
        String date2 = b2.getRide().getDate() != null ? b2.getRide().getDate() : "";
        int d = date1.compareTo(date2);
        if (d != 0) return d;
        String time1 = b1.getRide().getTime() != null ? b1.getRide().getTime() : "";
        String time2 = b2.getRide().getTime() != null ? b2.getRide().getTime() : "";
        return time1.compareTo(time2);
    }
}
