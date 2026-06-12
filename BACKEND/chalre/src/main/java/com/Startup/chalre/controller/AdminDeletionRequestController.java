package com.Startup.chalre.controller;

import com.Startup.chalre.DTO.DeletionRequestDTO;
import com.Startup.chalre.service.DeletionRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/deletion-requests")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminDeletionRequestController {

    private final DeletionRequestService service;

    @GetMapping
    public ResponseEntity<List<DeletionRequestDTO>> getAllRequests() {
        return ResponseEntity.ok(service.getAllRequests());
    }

    @PatchMapping("/{id}/complete")
    public ResponseEntity<?> markCompleted(@PathVariable Long id) {
        try {
            DeletionRequestDTO updated = service.markCompleted(id);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
