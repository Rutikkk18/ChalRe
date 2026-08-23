package com.Startup.chalre.Auth;

import com.Startup.chalre.config.RateLimitConfig;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.service.RateLimiterService;
import com.Startup.chalre.service.RateLimiterService.ConsumptionResult;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimitConfig config;
    private final RateLimiterService rateLimiterService;

    private static final Pattern IP_PATTERN = Pattern.compile("^[0-9a-fA-F.:]+$");

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        // 1. Skip pre-flight OPTIONS requests and infrastructure health checks
        String path = request.getServletPath();
        if ("OPTIONS".equalsIgnoreCase(request.getMethod()) || "/health".equals(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        if (!config.isEnabled()) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            String method = request.getMethod();
            String clientIp = resolveClientIp(request);
            String userIdOrIp = getAuthenticatedUserIdOrIp(clientIp);

            String bucketKey = null;
            long capacity = config.getGlobalCapacity();

            // ── Tier 1: Authentication Endpoints ──
            if ("POST".equalsIgnoreCase(method) && "/api/auth/login".equals(path)) {
                bucketKey = "AUTH_LOGIN:" + clientIp;
                capacity = config.getAuthLoginCapacity();
            } else if ("POST".equalsIgnoreCase(method) && "/api/auth/register".equals(path)) {
                bucketKey = "AUTH_REGISTER:" + clientIp;
                capacity = config.getAuthRegisterCapacity();
            } else if ("POST".equalsIgnoreCase(method) &&
                    ("/api/auth/firebase-login".equals(path) || "/api/auth/google-login".equals(path))) {
                bucketKey = "AUTH_SOCIAL:" + clientIp;
                capacity = config.getAuthSocialLoginCapacity();
            }

            // ── Tier 2: Public / External API Endpoints ──
            else if ("GET".equalsIgnoreCase(method) && path.startsWith("/api/locations")) {
                bucketKey = "PUBLIC_LOCATION:" + clientIp;
                capacity = config.getPublicLocationCapacity();
            } else if ("POST".equalsIgnoreCase(method) && "/api/rides/preview".equals(path)) {
                bucketKey = "PUBLIC_PREVIEW:" + clientIp;
                capacity = config.getPublicPreviewCapacity();
            } else if ("GET".equalsIgnoreCase(method) && "/api/rides/search".equals(path)) {
                bucketKey = "PUBLIC_SEARCH:" + clientIp;
                capacity = config.getPublicSearchCapacity();
            }

            // ── Tier 3: Authenticated User Actions ──
            else if ("POST".equalsIgnoreCase(method) && "/api/chat/send".equals(path)) {
                bucketKey = "USER_CHAT:" + userIdOrIp;
                capacity = config.getUserChatCapacity();
            } else if ("POST".equalsIgnoreCase(method) && "/api/rides/create".equals(path)) {
                bucketKey = "USER_RIDE_CREATE:" + userIdOrIp;
                capacity = config.getUserRideCreateCapacity();
            } else if ("POST".equalsIgnoreCase(method) && "/api/bookings/create".equals(path)) {
                bucketKey = "USER_BOOKING:" + userIdOrIp;
                capacity = config.getUserBookingCapacity();
            } else if ("POST".equalsIgnoreCase(method) && "/api/payments/create-order".equals(path)) {
                bucketKey = "USER_PAYMENT:" + userIdOrIp;
                capacity = config.getUserPaymentCapacity();
            } else if ("POST".equalsIgnoreCase(method) && path.startsWith("/api/ratings")) {
                bucketKey = "USER_RATING:" + userIdOrIp;
                capacity = config.getUserRatingCapacity();
            }

            // ── Global Fallback Limit ──
            else {
                bucketKey = "GLOBAL:" + userIdOrIp;
                capacity = config.getGlobalCapacity();
            }

            // Evaluate rate limit
            ConsumptionResult result = rateLimiterService.tryConsume(bucketKey, capacity);

            if (!result.isConsumed()) {
                response.setStatus(429); // 429 Too Many Requests
                response.setContentType("application/json");
                response.setHeader("Retry-After", String.valueOf(result.getSecondsToWait()));
                response.getWriter().write(String.format(
                        "{\"error\":\"Too Many Requests\",\"message\":\"Rate limit exceeded. Please try again in %d seconds.\"}",
                        result.getSecondsToWait()
                ));
                return; // Stop filter chain execution
            }

        } catch (Exception e) {
            // Fail-open: Log warning and continue request chain
            log.warn("RateLimiter error processing request for path {}: {}", path, e.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Resolves client IP address. Parses X-Forwarded-For if trustProxyHeaders is true.
     */
    private String resolveClientIp(HttpServletRequest request) {
        if (config.isTrustProxyHeaders()) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                // Leftmost IP is the original client IP appended by trusted proxy
                String firstIp = forwarded.split(",")[0].trim();
                if (IP_PATTERN.matcher(firstIp).matches()) {
                    return firstIp;
                }
            }
            String realIp = request.getHeader("X-Real-IP");
            if (realIp != null && !realIp.isBlank() && IP_PATTERN.matcher(realIp.trim()).matches()) {
                return realIp.trim();
            }
        }
        return request.getRemoteAddr();
    }

    /**
     * Retrieves authenticated User ID if SecurityContext is populated, otherwise falls back to client IP.
     */
    private String getAuthenticatedUserIdOrIp(String clientIp) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof User user) {
            return "USER_" + user.getId();
        }
        return "IP_" + clientIp;
    }
}
