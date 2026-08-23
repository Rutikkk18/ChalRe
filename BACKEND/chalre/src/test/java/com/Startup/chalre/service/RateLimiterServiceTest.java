package com.Startup.chalre.service;

import com.Startup.chalre.config.RateLimitConfig;
import com.Startup.chalre.service.RateLimiterService.ConsumptionResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class RateLimiterServiceTest {

    private RateLimitConfig config;
    private RateLimiterService rateLimiterService;

    @BeforeEach
    public void setUp() {
        config = new RateLimitConfig();
        config.setEnabled(true);
        rateLimiterService = new RateLimiterService(config);
    }

    @Test
    public void testRequestsBelowLimitAllowed() {
        String key = "TEST_KEY_1";
        long capacity = 3;

        for (int i = 0; i < 3; i++) {
            ConsumptionResult result = rateLimiterService.tryConsume(key, capacity);
            assertTrue(result.isConsumed(), "Request " + (i + 1) + " should be allowed");
        }
    }

    @Test
    public void testRequestExceedingLimitBlockedWithRetryAfter() {
        String key = "TEST_KEY_2";
        long capacity = 2;

        assertTrue(rateLimiterService.tryConsume(key, capacity).isConsumed());
        assertTrue(rateLimiterService.tryConsume(key, capacity).isConsumed());

        // 3rd request should be blocked
        ConsumptionResult blocked = rateLimiterService.tryConsume(key, capacity);
        assertFalse(blocked.isConsumed(), "3rd request should be blocked");
        assertTrue(blocked.getSecondsToWait() > 0, "Retry-After seconds should be > 0");
    }

    @Test
    public void testIndependentBucketsForDifferentKeys() {
        String keyA = "USER_A";
        String keyB = "USER_B";
        long capacity = 1;

        assertTrue(rateLimiterService.tryConsume(keyA, capacity).isConsumed());
        assertFalse(rateLimiterService.tryConsume(keyA, capacity).isConsumed(), "User A 2nd request blocked");

        // User B should still be allowed
        assertTrue(rateLimiterService.tryConsume(keyB, capacity).isConsumed(), "User B request allowed independently");
    }
}
