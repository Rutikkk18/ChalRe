package com.Startup.chalre.service;

import com.Startup.chalre.entity.User;
import com.Startup.chalre.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class OtpService {

    private final UserRepository userRepository;
    private final NotificationService notificationService;
    
    // In-memory storage for OTPs (in production, use Redis)
    private final Map<String, OtpData> otpStore = new ConcurrentHashMap<>();
    
    private static class OtpData {
        String otp;
        long expiryTime;
        String phone;
        
        OtpData(String otp, String phone) {
            this.otp = otp;
            this.phone = phone;
            this.expiryTime = System.currentTimeMillis() + (5 * 60 * 1000); // 5 minutes
        }
        
        boolean isExpired() {
            return System.currentTimeMillis() > expiryTime;
        }
    }

    /**
     * Generate and send OTP
     */
    public Map<String, String> generateOtp(String phone, String email) {
        // Validate user exists
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Generate 6-digit OTP
        Random random = new Random();
        String otp = String.format("%06d", random.nextInt(1000000));
        
        // Store OTP (key: email+phone)
        String key = email + ":" + phone;
        otpStore.put(key, new OtpData(otp, phone));
        
        // In production, send SMS via Twilio/MessageBird/etc.
        // For now, we'll just log it and send notification
        System.out.println("OTP for " + phone + ": " + otp);
        
        // Send notification (in production, send SMS)
        notificationService.sendNotification(
                user,
                "OTP Verification",
                "Your OTP is: " + otp + ". Valid for 5 minutes.",
                "OTP_SENT",
                Map.of("phone", phone)
        );
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "OTP sent to " + phone);
        // In development, return OTP for testing. Remove in production!
        response.put("otp", otp);
        return response;
    }

    /**
     * Verify OTP
     */
    public Map<String, String> verifyOtp(String email, String phone, String otp) {
        String key = email + ":" + phone;
        OtpData otpData = otpStore.get(key);
        
        if (otpData == null) {
            throw new RuntimeException("OTP not found. Please request a new OTP.");
        }
        
        if (otpData.isExpired()) {
            otpStore.remove(key);
            throw new RuntimeException("OTP has expired. Please request a new OTP.");
        }
        
        if (!otpData.otp.equals(otp)) {
            throw new RuntimeException("Invalid OTP. Please try again.");
        }
        
        // OTP verified - update user phone
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        user.setPhone(phone);
        userRepository.save(user);
        
        // Remove OTP
        otpStore.remove(key);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Phone number verified successfully");
        return response;
    }
}
