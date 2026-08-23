package com.Startup.chalre.service;

import com.Startup.chalre.config.RateLimitConfig;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class RateLimiterService {

    private final RateLimitConfig config;

    // In-memory bucket cache keyed by bucket identifier (e.g. "AUTH_LOGIN:192.168.1.1:user@example.com")
    private final Map<String, Bucket> bucketCache = new ConcurrentHashMap<>();

    public static class ConsumptionResult {
        private final boolean consumed;
        private final long secondsToWait;

        public ConsumptionResult(boolean consumed, long secondsToWait) {
            this.consumed = consumed;
            this.secondsToWait = secondsToWait;
        }

        public boolean isConsumed() {
            return consumed;
        }

        public long getSecondsToWait() {
            return secondsToWait;
        }
    }

    /**
     * Attempts to consume 1 token from the bucket identified by bucketKey.
     *
     * @param bucketKey Unique identifier for the rate limit bucket
     * @param capacity  Maximum capacity and refill per minute
     * @return ConsumptionResult with status and exact Retry-After seconds
     */
    public ConsumptionResult tryConsume(String bucketKey, long capacity) {
        if (!config.isEnabled() || capacity <= 0) {
            return new ConsumptionResult(true, 0);
        }

        Bucket bucket = bucketCache.computeIfAbsent(bucketKey, k -> createNewBucket(capacity));
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

        if (probe.isConsumed()) {
            return new ConsumptionResult(true, 0);
        } else {
            long nanosToWait = probe.getNanosToWaitForRefill();
            long secondsToWait = Math.max(1, (long) Math.ceil(nanosToWait / 1_000_000_000.0));
            log.warn("Rate limit exceeded for key: {}. Retry after {}s", bucketKey, secondsToWait);
            return new ConsumptionResult(false, secondsToWait);
        }
    }

    private Bucket createNewBucket(long capacity) {
        Bandwidth limit = Bandwidth.builder()
                .capacity(capacity)
                .refillGreedy(capacity, Duration.ofMinutes(1))
                .build();
        return Bucket.builder()
                .addLimit(limit)
                .build();
    }
}
