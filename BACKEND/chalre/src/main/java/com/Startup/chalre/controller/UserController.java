package com.Startup.chalre.controller;

import com.Startup.chalre.DTO.AuthResponseDTO;
import com.Startup.chalre.DTO.FirebaseLoginRequest;
import com.Startup.chalre.DTO.LoginDTO;
import com.Startup.chalre.DTO.RefreshTokenRequestDTO;
import com.Startup.chalre.DTO.UserRegisterDTO;
import com.Startup.chalre.DTO.UserUpdateDTO;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.service.RefreshTokenService;
import com.Startup.chalre.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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
    private final RefreshTokenService refreshTokenService;

    private boolean isMobileClient(String clientTypeHeader) {
        return clientTypeHeader != null && "mobile".equalsIgnoreCase(clientTypeHeader.trim());
    }

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
    public ResponseEntity<?> login(
            @RequestBody LoginDTO dto,
            @RequestHeader(value = "X-Client-Type", required = false) String clientType) {

        User user = userService.validateLogin(dto);
        AuthResponseDTO authResponse = userService.buildAuthResponse(user, isMobileClient(clientType));
        return ResponseEntity.ok(authResponse);
    }

    @GetMapping("/check-login-method")
    public ResponseEntity<?> checkLoginMethod(@RequestParam String email) {
        boolean googleOnly = userService.isGoogleOnlyAccount(email);
        return ResponseEntity.ok(Collections.singletonMap("googleOnly", googleOnly));
    }

    @PostMapping("/firebase-login")
    public ResponseEntity<?> firebaseLogin(
            @RequestBody FirebaseLoginRequest request,
            @RequestHeader(value = "X-Client-Type", required = false) String clientType) {
        try {
            User user = userService.authenticateOrProvisionFirebaseUser(request);
            AuthResponseDTO authResponse = userService.buildAuthResponse(user, isMobileClient(clientType));
            return ResponseEntity.ok(authResponse);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(403).body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.status(400).body(e.getMessage());
        }
    }

    @PostMapping("/google-login")
    public ResponseEntity<?> googleLogin(
            @RequestBody FirebaseLoginRequest request,
            @RequestHeader(value = "X-Client-Type", required = false) String clientType) {
        try {
            User user = userService.authenticateOrProvisionFirebaseUser(request);
            AuthResponseDTO authResponse = userService.buildAuthResponse(user, isMobileClient(clientType));
            return ResponseEntity.ok(authResponse);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(403).body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.status(400).body(e.getMessage());
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(@Valid @RequestBody RefreshTokenRequestDTO request) {
        try {
            AuthResponseDTO response = refreshTokenService.rotateRefreshToken(request.getRefreshToken());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of(
                    "error", "Unauthorized",
                    "message", e.getMessage() != null ? e.getMessage() : "Invalid refresh token"
            ));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody(required = false) RefreshTokenRequestDTO request) {
        if (request != null && request.getRefreshToken() != null) {
            refreshTokenService.revokeToken(request.getRefreshToken());
        }
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {

        if (authentication == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(user);
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(
            @Valid @RequestBody UserUpdateDTO dto,
            BindingResult bindingResult,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        if (bindingResult.hasErrors()) {
            String errorMessage = bindingResult.getFieldErrors().stream()
                    .map(error -> error.getField() + ": " + error.getDefaultMessage())
                    .collect(Collectors.joining(", "));
            return ResponseEntity.badRequest().body(errorMessage);
        }

        User updated = userService.updateProfile(user.getId(), dto);
        return ResponseEntity.ok(updated);
    }

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