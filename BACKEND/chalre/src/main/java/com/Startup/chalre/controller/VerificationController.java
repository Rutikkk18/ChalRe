package com.Startup.chalre.controller;

import com.Startup.chalre.entity.User;
import com.Startup.chalre.service.VerificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/driver")
@RequiredArgsConstructor
public class VerificationController {

    private final VerificationService verificationService;

    // ✅ FILE UPLOAD ENDPOINT
    @PostMapping(value = "/verify/submit", consumes = "multipart/form-data")
    public ResponseEntity<?> submitVerification(
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam("types") List<String> types,
            @AuthenticationPrincipal User user) {

        verificationService.submitVerification(user, files, types);
        return ResponseEntity.ok("Verification submitted");
    }

    // ✅ ADMIN REVIEW (UNCHANGED)
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/verify/{userId}/review")
    public ResponseEntity<?> reviewVerification(
            @PathVariable Long userId,
            @RequestParam boolean approve,
            @RequestParam(required = false) String remarks) {

        verificationService.adminReview(userId, approve, remarks);
        return ResponseEntity.ok("Review completed");
    }
}
