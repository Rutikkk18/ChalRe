package com.Startup.chalre.controller;

import com.Startup.chalre.DTO.FirebaseLoginRequest;
import com.Startup.chalre.DTO.LoginDTO;
import com.Startup.chalre.DTO.UserRegisterDTO;
import com.Startup.chalre.DTO.UserUpdateDTO;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping("/register")
    public ResponseEntity<?> register(
            @Valid @RequestBody UserRegisterDTO dto,
            BindingResult bindingResult) {

        if (bindingResult.hasErrors()) {
            String errorMessage = bindingResult.getFieldErrors().stream()
                    .map(error -> error.getField() + ": " + error.getDefaultMessage())
                    .collect(Collectors.joining(", "));
            return ResponseEntity.badRequest().body(errorMessage);
        }

        return ResponseEntity.ok(userService.registeruser(dto));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginDTO dto) {

        User user = userService.validateLogin(dto);
        String token = userService.generateJwtForUser(user);

        return ResponseEntity.ok(Collections.singletonMap("token", token));
    }

    @PostMapping("/firebase-login")
    public ResponseEntity<?> firebaseLogin(@RequestBody FirebaseLoginRequest request) {
        try {
            String token = userService.loginWithFirebaseToken(request);
            return ResponseEntity.ok(Collections.singletonMap("token", token));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(403).body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.status(400).body(e.getMessage());
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        return ResponseEntity.ok(user);
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(
            @RequestBody UserUpdateDTO dto,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        User updated = userService.updateProfile(user.getId(), dto);
        return ResponseEntity.ok(updated);
    }

    // ✅ FIXED: Add / Update UPI ID (NO save() call)
    @PostMapping("/upi")
    public ResponseEntity<?> updateUpiId(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        String upiId = body.get("upiId");

        if (upiId == null || !upiId.matches("^[a-zA-Z0-9.\\-_]{2,}@[a-zA-Z]{2,}$")) {
            return ResponseEntity.badRequest().body("Invalid UPI ID");
        }

        UserUpdateDTO dto = new UserUpdateDTO();
        dto.setUpiId(upiId.trim());

        User updated = userService.updateProfile(user.getId(), dto);

        return ResponseEntity.ok(Map.of(
                "message", "UPI ID saved successfully",
                "upiId", updated.getUpiId()
        ));
    }
}
