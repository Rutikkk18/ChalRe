package com.Startup.chalre.JWTTOKEN;

import com.Startup.chalre.entity.User;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Date;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.access-token.expiry-ms:900000}")
    private long accessTokenExpiryMs; // Default: 15 minutes (900,000 ms)

    private final SecureRandom secureRandom = new SecureRandom();

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    // Generate token with custom TTL (e.g., 15 minutes for mobile, or 30 days for legacy/web)
    public String generateTokenWithExpiry(User user, long expiryMs) {
        return Jwts.builder()
                .setSubject(user.getEmail())
                .claim("role", user.getRole())
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expiryMs))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    // Default short-lived access token (15 minutes)
    public String generateAccessToken(User user) {
        return generateTokenWithExpiry(user, accessTokenExpiryMs);
    }

    // Generate legacy/web long-lived token (30 days)
    public String generateToken(User user) {
        return generateTokenWithExpiry(user, 1000L * 60 * 60 * 24 * 30);
    }

    public String generateTokenFromEmailAndRole(String email, String role) {
        return Jwts.builder()
                .setSubject(email)
                .claim("role", role)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + 1000L * 60 * 60 * 24 * 30))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    // Generates a 32-byte cryptographically secure opaque string for refresh tokens
    public String generateOpaqueRefreshToken() {
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    public String extractEmail(String token) {
        return Jwts
                .parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    public String extractRole(String token) {
        return Jwts
                .parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody()
                .get("role", String.class);
    }

    public long getAccessTokenExpiryMs() {
        return accessTokenExpiryMs;
    }
}