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
        // Check if email already exists
        if (userRepository.findByEmail(dto.getEmail()).isPresent()) {
            throw new RuntimeException("Email already registered");
        }
        // Check if phone already exists
        if (userRepository.findByPhone(dto.getPhone()).isPresent()) {
            throw new RuntimeException("Phone number already registered");
        }
        
        User user = new User();
        user.setName(dto.getName());
        user.setEmail(dto.getEmail());
        user.setPhone(dto.getPhone());
        // Set default role if not provided
        user.setRole(dto.getRole() != null && !dto.getRole().isEmpty() ? dto.getRole() : "USER");
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        return userRepository.save(user);
    }

    // 🔥 updated login validation
    public User validateLogin(LoginDTO dto) {
        User user = userRepository.findByEmail(dto.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(dto.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid password");
        }

        return user;
    }

    // 🔥 generate JWT containing email + role
    public String generateJwtForUser(User user) {
        return jwtUtil.generateToken(user);
    }

    // used by /me
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

        log.info("Firebase login request: {}", request);

        if (request.getIdToken() == null || request.getIdToken().isBlank()) {
            throw new IllegalArgumentException("Firebase idToken is required");
        }

        FirebaseToken decodedToken;
        try {
            decodedToken = FirebaseAuth.getInstance().verifyIdToken(request.getIdToken());
        } catch (FirebaseAuthException e) {
            log.error("Firebase token verification failed", e);
            throw new IllegalArgumentException("Invalid Firebase token");
        }

        if (!decodedToken.isEmailVerified()) {
            throw new IllegalStateException("Email not verified");
        }

        String email = decodedToken.getEmail();
        if (email == null || email.isBlank()) {
            throw new IllegalStateException("Email missing from Firebase token");
        }

        String incomingPhone = request.getPhone() != null ? request.getPhone().trim() : null;
        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            if (incomingPhone == null || incomingPhone.isEmpty()) {
                throw new IllegalArgumentException("Phone number is required to finish signup");
            }

            if (userRepository.findByPhone(incomingPhone).isPresent()) {
                throw new IllegalArgumentException("Phone number already registered");
            }

            user = new User();
            user.setEmail(email);
            user.setName(resolveName(request, decodedToken));
            user.setPhone(incomingPhone);
            user.setRole("USER");
        } else {
            if ((user.getPhone() == null || user.getPhone().isBlank()) && incomingPhone != null && !incomingPhone.isEmpty()) {
                user.setPhone(incomingPhone);
            }
            if (user.getName() == null || user.getName().isBlank()) {
                user.setName(resolveName(request, decodedToken));
            }
        }

        if (user.getPhone() == null || user.getPhone().isBlank()) {
            throw new IllegalArgumentException("Phone number is required");
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
