package com.Startup.chalre.service;

import com.Startup.chalre.DTO.FirebaseLoginRequest;
import com.Startup.chalre.DTO.LoginDTO;
import com.Startup.chalre.DTO.UserRegisterDTO;
import com.Startup.chalre.DTO.UserUpdateDTO;
import com.Startup.chalre.JWTTOKEN.JwtUtil;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.repository.UserRepository;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public User registeruser(UserRegisterDTO dto) {
        if (userRepository.findByEmail(dto.getEmail()).isPresent()) {
            throw new RuntimeException("Email already registered");
        }
        if (userRepository.findByPhone(dto.getPhone()).isPresent()) {
            throw new RuntimeException("Phone number already registered");
        }

        User user = new User();
        user.setName(dto.getName());
        user.setEmail(dto.getEmail());
        user.setPhone(dto.getPhone());
        user.setRole(dto.getRole() != null && !dto.getRole().isEmpty() ? dto.getRole() : "USER");
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        return userRepository.save(user);
    }

    public User validateLogin(LoginDTO dto) {
        User user = userRepository.findByEmail(dto.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(dto.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid password");
        }

        return user;
    }

    public String generateJwtForUser(User user) {
        return jwtUtil.generateToken(user);
    }

    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @Transactional
    public User updateProfile(Long userId, UserUpdateDTO dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (dto.getName() != null && !dto.getName().trim().isEmpty()) {
            user.setName(dto.getName().trim());
        }
        if (dto.getPhone() != null && !dto.getPhone().trim().isEmpty()) {
            user.setPhone(dto.getPhone().trim());
        }
        if (dto.getProfileImage() != null) {
            user.setProfileImage(dto.getProfileImage());
        }
        if (dto.getUpiId() != null && !dto.getUpiId().trim().isEmpty()) {
            user.setUpiId(dto.getUpiId().trim());
        }

        return userRepository.save(user);
    }

    public String loginWithFirebaseToken(FirebaseLoginRequest request) {

        log.info("Firebase login request received");

        if (request.getIdToken() == null || request.getIdToken().isBlank()) {
            throw new IllegalArgumentException("Firebase idToken is required");
        }

        FirebaseToken decodedToken;
        try {
            decodedToken = FirebaseAuth.getInstance().verifyIdToken(request.getIdToken());
        } catch (FirebaseAuthException e) {
            log.error("Firebase token verification failed: {}", e.getMessage());
            throw new IllegalStateException("Firebase authentication failed");
        }

        String uid = decodedToken.getUid();
        String email = decodedToken.getEmail();

        if (email == null || email.isBlank()) {
            throw new IllegalStateException("Email missing from Firebase token");
        }

        log.info("Firebase user verified: email={}, uid={}", email, uid);

        // Step 1: Try to find user by uid
        User user = userRepository.findByUid(uid).orElse(null);

        // Step 2: If not found, try to find by email (legacy fallback)
        if (user == null) {
            user = userRepository.findByEmail(email).orElse(null);
            if (user != null) {
                // Step 3: If found by email but no uid, update user with uid
                log.info("Legacy user found by email. Updating UID.");
                user.setUid(uid);
            }
        }

        String incomingPhone = request.getPhone() != null ? request.getPhone().trim() : null;

        // Step 4: If not found at all, create new User
        if (user == null) {
            log.info("Creating new user for UID: {}", uid);
            user = new User();
            user.setUid(uid);
            user.setEmail(email);
            user.setName(resolveName(request, decodedToken));
            user.setRole("USER");

            // Set phone only if provided (non-null/non-empty)
            if (incomingPhone != null && !incomingPhone.isEmpty()) {
                if (userRepository.findByPhone(incomingPhone).isPresent()) {
                    throw new IllegalArgumentException("Phone number already registered");
                }
                user.setPhone(incomingPhone);
            }
            // Removed exception: Phone number is required to finish signup
        } else {
            // Update existing user details
            if (user.getUid() == null) {
                user.setUid(uid);
            }
            
            // Update phone if provided and not set, or update if different? 
            // Stick to legacy behavior: update if null, or maybe update if provided?
            // User might have new phone. 
            // Current Plan says "Step 4: If not found at all...". 
            // For existing, let's just ensure UID is set. 
            // Also update phone if missing in DB but provided in request (helpful for migration)
            if ((user.getPhone() == null || user.getPhone().isBlank()) && incomingPhone != null && !incomingPhone.isEmpty()) {
                 if (userRepository.findByPhone(incomingPhone).isPresent()) {
                     // Check if it is NOT this user (though finding by phone for null phone user won't match self)
                     throw new IllegalArgumentException("Phone number already registered");
                 }
                 user.setPhone(incomingPhone);
            }
            
            if (user.getName() == null || user.getName().isBlank()) {
                user.setName(resolveName(request, decodedToken));
            }
        }

        userRepository.save(user);
        return jwtUtil.generateToken(user);
    }

    private String resolveName(FirebaseLoginRequest request, FirebaseToken decodedToken) {
        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            return request.getName().trim();
        }
        if (decodedToken.getName() != null && !decodedToken.getName().isBlank()) {
            return decodedToken.getName();
        }
        if (decodedToken.getEmail() != null) {
            return decodedToken.getEmail().split("@")[0];
        }
        return "User";
    }
}
