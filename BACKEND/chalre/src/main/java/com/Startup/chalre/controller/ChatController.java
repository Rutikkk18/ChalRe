package com.Startup.chalre.controller;

import com.Startup.chalre.DTO.ChatMessageDTO;
import com.Startup.chalre.entity.ChatMessage;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @PostMapping("/send")
    public ResponseEntity<?> sendMessage(
            @RequestBody ChatMessageDTO dto,
            @AuthenticationPrincipal User user
    ) {
        ChatMessage message = chatService.sendMessage(dto, user);
        return ResponseEntity.ok(message);
    }

    @GetMapping("/ride/{rideId}")
    public ResponseEntity<?> getChatMessages(
            @PathVariable Long rideId,
            @AuthenticationPrincipal User user
    ) {
        List<ChatMessage> messages = chatService.getChatMessages(rideId, user);
        return ResponseEntity.ok(messages);
    }

    @PostMapping("/ride/{rideId}/read")
    public ResponseEntity<?> markAsRead(
            @PathVariable Long rideId,
            @AuthenticationPrincipal User user
    ) {
        chatService.markAsRead(rideId, user);
        return ResponseEntity.ok(Map.of("status", "marked as read"));
    }

    @GetMapping("/ride/{rideId}/unread-count")
    public ResponseEntity<?> getUnreadCount(
            @PathVariable Long rideId,
            @AuthenticationPrincipal User user
    ) {
        long count = chatService.getUnreadCount(rideId, user);
        return ResponseEntity.ok(Map.of("count", count));
    }
}
