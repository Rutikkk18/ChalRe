package com.Startup.chalre.service;

import com.Startup.chalre.DTO.AuthResponseDTO;
import com.Startup.chalre.JWTTOKEN.JwtUtil;
import com.Startup.chalre.entity.RefreshToken;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
@Slf4j
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtUtil jwtUtil;

    @Value("${jwt.refresh-token.expiry-days:30}")
    private long refreshTokenExpiryDays;

    private static final long REPLAY_GRACE_PERIOD_SECONDS = 30;

    public String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashBytes);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }

    @Transactional
    public String createRefreshToken(User user) {
        String rawToken = jwtUtil.generateOpaqueRefreshToken();
        String tokenHash = hashToken(rawToken);

        RefreshToken entity = RefreshToken.builder()
                .tokenHash(tokenHash)
                .user(user)
                .createdAt(Instant.now())
                .expiresAt(Instant.now().plus(refreshTokenExpiryDays, ChronoUnit.DAYS))
                .build();

        refreshTokenRepository.save(entity);
        return rawToken;
    }

    @Transactional
    public AuthResponseDTO rotateRefreshToken(String rawOldToken) {
        if (rawOldToken == null || rawOldToken.isBlank()) {
            throw new BadCredentialsException("Refresh token is required");
        }

        String oldHash = hashToken(rawOldToken.trim());
        Instant now = Instant.now();

        // Generate new candidate refresh token ahead of rotation
        String newRawToken = jwtUtil.generateOpaqueRefreshToken();
        String newHash = hashToken(newRawToken);

        // Atomic conditional rotation query: ensures exactly one concurrent request succeeds
        int rowsUpdated = refreshTokenRepository.rotateTokenAtomically(oldHash, newHash, now);

        if (rowsUpdated == 1) {
            // Successfully rotated this token atomically
            RefreshToken oldToken = refreshTokenRepository.findByTokenHash(oldHash)
                    .orElseThrow(() -> new BadCredentialsException("Token record not found"));

            User user = oldToken.getUser();

            RefreshToken newToken = RefreshToken.builder()
                    .tokenHash(newHash)
                    .user(user)
                    .createdAt(now)
                    .expiresAt(now.plus(refreshTokenExpiryDays, ChronoUnit.DAYS))
                    .build();

            refreshTokenRepository.save(newToken);

            String newAccessToken = jwtUtil.generateAccessToken(user);

            return AuthResponseDTO.builder()
                    .token(newAccessToken) // Legacy backwards compatibility
                    .accessToken(newAccessToken)
                    .refreshToken(newRawToken)
                    .tokenType("Bearer")
                    .expiresIn(jwtUtil.getAccessTokenExpiryMs() / 1000)
                    .build();
        }

        // rowsUpdated == 0: either token does not exist, was expired, or was already rotated
        RefreshToken existingToken = refreshTokenRepository.findByTokenHash(oldHash)
                .orElseThrow(() -> new BadCredentialsException("Invalid refresh token"));

        if (existingToken.getExpiresAt().isBefore(now)) {
            throw new BadCredentialsException("Refresh token expired");
        }

        if (existingToken.getRevokedAt() != null) {
            long secondsSinceRevocation = Duration.between(existingToken.getRevokedAt(), now).getSeconds();

            if (existingToken.getReplacedByTokenHash() != null && secondsSinceRevocation < REPLAY_GRACE_PERIOD_SECONDS) {
                // In-flight duplicate or race within 30-second grace window: reject cleanly without nuking all sessions
                log.warn("Concurrent duplicate refresh request detected within grace window ({}s). Rejecting gracefully.", secondsSinceRevocation);
                throw new BadCredentialsException("Refresh token already rotated. Please use latest credentials.");
            } else if (existingToken.getReplacedByTokenHash() != null) {
                // Genuine token replay outside grace window: token reuse detected!
                log.error("SECURITY ALERT: Refresh token reuse detected for user ID {}! Revoking all sessions.", existingToken.getUser().getId());
                refreshTokenRepository.revokeAllByUser(existingToken.getUser(), now);
                throw new BadCredentialsException("Security violation: Token reuse detected. All sessions terminated.");
            } else {
                throw new BadCredentialsException("Refresh token has been revoked.");
            }
        }

        throw new BadCredentialsException("Unable to refresh token");
    }

    @Transactional
    public void revokeToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) return;
        String tokenHash = hashToken(rawToken.trim());
        refreshTokenRepository.findByTokenHash(tokenHash).ifPresent(token -> {
            if (token.getRevokedAt() == null) {
                token.setRevokedAt(Instant.now());
                refreshTokenRepository.save(token);
            }
        });
    }

    @Transactional
    public void revokeAllUserSessions(User user) {
        refreshTokenRepository.revokeAllByUser(user, Instant.now());
    }

    // Daily maintenance job to purge naturally expired tokens
    @Scheduled(cron = "0 0 3 * * ?")
    @Transactional
    public void cleanupExpiredTokens() {
        log.info("Running scheduled refresh token cleanup...");
        refreshTokenRepository.deleteExpiredTokens(Instant.now());
    }
}
