package com.Startup.chalre.controller;

import com.Startup.chalre.DTO.VerificationDTO;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.service.VerificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/driver")
@RequiredArgsConstructor
public class VerificationController {

    private final VerificationService verificationService;

    @PostMapping("/verify/submit")
    public ResponseEntity<?> submitVerification(@RequestBody VerificationDTO dto,
                                                @AuthenticationPrincipal User user) {

        verificationService.submitVerification(user, dto.getUrls(), dto.getTypes());
        return ResponseEntity.ok("Verification submitted");
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/verify/{userId}/review")
    public ResponseEntity<?> reviewVerification(@PathVariable Long userId,
                                                @RequestParam boolean approve,
                                                @RequestParam(required = false) String remarks) {

        verificationService.adminReview(userId, approve, remarks);
        return ResponseEntity.ok("Review completed");
    }
}