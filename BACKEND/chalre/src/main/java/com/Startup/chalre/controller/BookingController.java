package com.Startup.chalre.controller;

import com.Startup.chalre.DTO.BookingDTO;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    // BOOK RIDE
    @PostMapping("/create")
    public ResponseEntity<?> bookRide(
            @Valid @RequestBody BookingDTO dto,
            BindingResult bindingResult,
            @AuthenticationPrincipal User user) {

        // Handle validation errors
        if (bindingResult.hasErrors()) {
            String errorMessage = bindingResult.getFieldErrors().stream()
                    .map(error -> {
                        // Customize error messages for better UX
                        if ("paymentMethod".equals(error.getField())) {
                            return "Payment method is required. Please select CASH or ONLINE.";
                        }
                        return error.getField() + ": " + error.getDefaultMessage();
                    })
                    .collect(Collectors.joining(", "));
            return ResponseEntity.badRequest().body(errorMessage);
        }

        try {
            return ResponseEntity.ok(bookingService.bookRide(dto, user));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Internal server error: " + e.getMessage());
        }
    }

    // CANCEL BOOKING
    @DeleteMapping("/{id}")
    public ResponseEntity<?> cancelRide(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {

        return ResponseEntity.ok(bookingService.cancelBooking(id, user));
    }

    // GET MY BOOKINGS
    @GetMapping("/my")
    public ResponseEntity<?> getMyBookings(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String filter
    ) {
        if ("separated".equals(filter)) {
            return ResponseEntity.ok(bookingService.getMyBookingsSeparated(user));
        }
        return ResponseEntity.ok(bookingService.getMyBookings(user));
    }
}
