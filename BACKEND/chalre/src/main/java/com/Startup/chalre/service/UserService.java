package com.Startup.chalre.service;

import com.Startup.chalre.DTO.LoginDTO;
import com.Startup.chalre.DTO.UserRegisterDTO;
import com.Startup.chalre.DTO.UserUpdateDTO;
import com.Startup.chalre.JWTTOKEN.JwtUtil;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import jakarta.transaction.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public User registeruser(UserRegisterDTO dto) {
        // Check if email already exists
        if (userRepository.findByEmail(dto.getEmail()).isPresent()) {
            throw new RuntimeException("Email already registered");
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

        return userRepository.save(user);
    }
}
