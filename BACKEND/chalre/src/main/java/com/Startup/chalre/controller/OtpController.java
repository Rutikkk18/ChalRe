package com.Startup.chalre.controller;

import com.Startup.chalre.service.OtpService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/otp")
@RequiredArgsConstructor
public class OtpController {

    private final OtpService otpService;

    @PostMapping("/generate")
    public ResponseEntity<?> generateOtp(@RequestBody Map<String, String> request) {
        String phone = request.get("phone");
        String email = request.get("email");
        
        if (phone == null || email == null) {
            return ResponseEntity.badRequest().body("Phone and email are required");
        }
        
        return ResponseEntity.ok(otpService.generateOtp(phone, email));
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> request) {
        String phone = request.get("phone");
        String email = request.get("email");
        String otp = request.get("otp");
        
        if (phone == null || email == null || otp == null) {
            return ResponseEntity.badRequest().body("Phone, email, and OTP are required");
        }
        
        return ResponseEntity.ok(otpService.verifyOtp(email, phone, otp));
    }
}
