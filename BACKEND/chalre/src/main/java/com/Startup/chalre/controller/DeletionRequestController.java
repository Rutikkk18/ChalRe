package com.Startup.chalre.controller;

import com.Startup.chalre.DTO.DeletionRequestDTO;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.service.DeletionRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/deletion-requests")
@RequiredArgsConstructor
public class DeletionRequestController {

    private final DeletionRequestService service;

    @PostMapping
    public ResponseEntity<?> createRequest(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        try {
            DeletionRequestDTO created = service.createRequest(user);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMyRequest(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }
        DeletionRequestDTO latest = service.getLatestRequest(user);
        return ResponseEntity.ok(latest);
    }
}
