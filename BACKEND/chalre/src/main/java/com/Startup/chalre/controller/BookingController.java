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
                    .map(error -> error.getField() + ": " + error.getDefaultMessage())
                    .collect(Collectors.joining(", "));
            return ResponseEntity.badRequest().body(errorMessage);
        }

        // Validate payment mode
        if (dto.getPaymentMode() == null || 
            (!dto.getPaymentMode().equalsIgnoreCase("WALLET")
                && !dto.getPaymentMode().equalsIgnoreCase("CASH"))) {
            return ResponseEntity.badRequest().body("Invalid payment mode. Use WALLET or CASH.");
        }

        return ResponseEntity.ok(bookingService.bookRide(dto, user));
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
