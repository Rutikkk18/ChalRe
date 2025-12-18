package com.Startup.chalre.controller;

import com.Startup.chalre.DTO.DeviceTokenDTO;
import com.Startup.chalre.entity.DeviceToken;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * Register or update device token
     */
    @PostMapping("/register")
    public ResponseEntity<?> registerToken(
            @RequestBody DeviceTokenDTO dto,
            @AuthenticationPrincipal User user) {

        notificationService.registerDeviceToken(user, dto);
        return ResponseEntity.ok("registered");
    }

    /**
     * Get user notifications (paginated)
     */
    @GetMapping("/my")
    public ResponseEntity<?> myNotifications(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        return ResponseEntity.ok(notificationService.getNotifications(user, page, size));
    }

    /**
     * Mark notification as read
     */
    @PostMapping("/{id}/read")
    public ResponseEntity<?> markRead(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {

        notificationService.markAsRead(id, user);
        return ResponseEntity.ok("read");
    }

    /**
     * Delete notification
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteNotification(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {

        notificationService.deleteNotification(id, user);
        return ResponseEntity.ok("deleted");
    }
}
