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
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    // =========================
    // NORMAL REGISTER (NON FIREBASE)
    // =========================
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
        user.setRole(
                dto.getRole() != null && !dto.getRole().isEmpty()
                        ? dto.getRole()
                        : "USER"
        );
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        return userRepository.save(user);
    }

    // =========================
    // NORMAL LOGIN (NON FIREBASE)
    // =========================
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

    // =========================
    // PROFILE UPDATE
    // =========================
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

    // =========================
    // 🔥 FIREBASE LOGIN (FIXED)
    // =========================
    @Transactional
    public String loginWithFirebaseToken(FirebaseLoginRequest request) {

        log.info("Firebase login request received");

        if (request.getIdToken() == null || request.getIdToken().isBlank()) {
            throw new IllegalArgumentException("Firebase idToken is required");
        }

        FirebaseToken decodedToken;
        try {
            decodedToken = FirebaseAuth.getInstance()
                    .verifyIdToken(request.getIdToken());
        } catch (FirebaseAuthException e) {
            log.error("Firebase token verification failed", e);
            throw new IllegalStateException("Firebase authentication failed");
        }

        String uid = decodedToken.getUid();
        String email = decodedToken.getEmail();

        if (email == null || email.isBlank()) {
            throw new IllegalStateException("Email missing from Firebase token");
        }

        log.info("Firebase verified: email={}, uid={}", email, uid);

        // 1️⃣ Try UID
        User user = userRepository.findByUid(uid).orElse(null);

        // 2️⃣ Fallback by email (legacy users)
        if (user == null) {
            user = userRepository.findByEmail(email).orElse(null);
            if (user != null && user.getUid() == null) {
                user.setUid(uid);
            }
        }

        String incomingPhone =
                request.getPhone() != null ? request.getPhone().trim() : null;

        // 3️⃣ New user
        if (user == null) {
            log.info("Creating new Firebase user");

            user = new User();
            user.setUid(uid);
            user.setEmail(email);
            user.setName(resolveName(request, decodedToken));
            user.setRole("USER");

            if (incomingPhone != null && !incomingPhone.isEmpty()) {
                userRepository.findByPhone(incomingPhone)
                        .ifPresent(u -> {
                            throw new IllegalArgumentException(
                                    "Phone number already registered"
                            );
                        });
                user.setPhone(incomingPhone);
            }
        }
        // 4️⃣ Existing user
        else {
            if (user.getUid() == null) {
                user.setUid(uid);
            }

            if ((user.getPhone() == null || user.getPhone().isBlank())
                    && incomingPhone != null
                    && !incomingPhone.isEmpty()) {

                userRepository.findByPhone(incomingPhone)
                        .ifPresent(u -> {
                            if (!u.getId().equals(user.getId())) {
                                throw new IllegalArgumentException(
                                        "Phone number already registered"
                                );
                            }
                        });
                user.setPhone(incomingPhone);
            }

            if (user.getName() == null || user.getName().isBlank()) {
                user.setName(resolveName(request, decodedToken));
            }
        }

        userRepository.saveAndFlush(user);
        log.info("User saved successfully: {}", user.getEmail());

        return jwtUtil.generateToken(user);
    }

    // =========================
    // NAME RESOLVER
    // =========================
    private String resolveName(
            FirebaseLoginRequest request,
            FirebaseToken decodedToken
    ) {
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
