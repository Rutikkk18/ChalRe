package com.Startup.chalre.config;

import lombok.Data;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
@Data
public class RateLimitConfig {

    @Value("${rate-limit.enabled:true}")
    private boolean enabled;

    @Value("${rate-limit.trust-proxy-headers:true}")
    private boolean trustProxyHeaders;

    // Tier 1 — Auth
    @Value("${rate-limit.auth.login.capacity:5}")
    private long authLoginCapacity;

    @Value("${rate-limit.auth.register.capacity:5}")
    private long authRegisterCapacity;

    @Value("${rate-limit.auth.social-login.capacity:10}")
    private long authSocialLoginCapacity;

    // Tier 2 — Public / External API
    @Value("${rate-limit.public.location.capacity:30}")
    private long publicLocationCapacity;

    @Value("${rate-limit.public.preview.capacity:10}")
    private long publicPreviewCapacity;

    @Value("${rate-limit.public.search.capacity:60}")
    private long publicSearchCapacity;

    // Tier 3 — Authenticated User Actions
    @Value("${rate-limit.user.chat.capacity:30}")
    private long userChatCapacity;

    @Value("${rate-limit.user.ride-create.capacity:10}")
    private long userRideCreateCapacity;

    @Value("${rate-limit.user.booking.capacity:10}")
    private long userBookingCapacity;

    @Value("${rate-limit.user.payment.capacity:5}")
    private long userPaymentCapacity;

    @Value("${rate-limit.user.rating.capacity:10}")
    private long userRatingCapacity;

    // Global Fallback
    @Value("${rate-limit.global.capacity:300}")
    private long globalCapacity;
}
