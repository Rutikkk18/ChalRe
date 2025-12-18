package com.Startup.chalre.controller;



import com.Startup.chalre.DTO.VerificationDetailDTO;
import com.Startup.chalre.DTO.VerificationListDTO;
import com.Startup.chalre.service.AdminVerificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/verifications")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminVerificationController {

    private final AdminVerificationService adminVerificationService;

    // 1. Get all verifications by status (PENDING, APPROVED, REJECTED)
    @GetMapping
    public ResponseEntity<List<VerificationListDTO>> getAll(
            @RequestParam(defaultValue = "PENDING") String status) {

        return ResponseEntity.ok(adminVerificationService.getVerificationsByStatus(status));
    }

    // 2. Get full details of user and documents
    @GetMapping("/{userId}")
    public ResponseEntity<VerificationDetailDTO> getDetails(@PathVariable Long userId) {

        return ResponseEntity.ok(adminVerificationService.getVerificationDetails(userId));
    }
}
