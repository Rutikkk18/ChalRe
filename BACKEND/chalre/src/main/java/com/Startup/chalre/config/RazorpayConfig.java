package com.Startup.chalre.config;

import com.razorpay.RazorpayClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

@Configuration
public class RazorpayConfig {

    private static final Logger logger = LoggerFactory.getLogger(RazorpayConfig.class);

    @Value("${razorpay.key:}")
    private String key;

    @Value("${razorpay.secret:}")
    private String secret;

    @Bean
    public RazorpayClient razorpayClient() throws Exception {
        // Log configuration source (for debugging)
        String keySource = System.getenv("RAZORPAY_KEY") != null ? "environment variable" : "application.yaml";
        logger.info("Loading Razorpay configuration from: {}", keySource);
        
        // Validate keys are not empty
        if (!StringUtils.hasText(key) || !StringUtils.hasText(secret)) {
            String errorMsg = String.format(
                "Razorpay keys are not configured. " +
                "Current key: %s, secret: %s. " +
                "Please set RAZORPAY_KEY and RAZORPAY_SECRET environment variables " +
                "or configure them in application.yaml",
                key != null ? (key.length() > 0 ? key.substring(0, Math.min(10, key.length())) + "..." : "empty") : "null",
                secret != null ? (secret.length() > 0 ? "***" : "empty") : "null"
            );
            logger.error(errorMsg);
            throw new IllegalStateException(errorMsg);
        }
        
        // Validate key format (should start with rzp_)
        if (!key.startsWith("rzp_")) {
            String errorMsg = String.format(
                "Invalid Razorpay key format. Key should start with 'rzp_'. " +
                "Current key starts with: %s",
                key.length() > 5 ? key.substring(0, 5) : key
            );
            logger.error(errorMsg);
            throw new IllegalStateException(errorMsg);
        }
        
        // Validate secret is not empty (should be at least 20 chars)
        if (secret.length() < 20) {
            logger.warn("Razorpay secret seems too short. Please verify your RAZORPAY_SECRET.");
        }
        
        try {
            logger.info("Initializing Razorpay client with key: {}...", key.substring(0, Math.min(15, key.length())));
            RazorpayClient client = new RazorpayClient(key, secret);
            logger.info("Razorpay client initialized successfully");
            return client;
        } catch (Exception e) {
            String errorMsg = String.format(
                "Failed to initialize Razorpay client: %s. " +
                "Please verify your RAZORPAY_KEY and RAZORPAY_SECRET are correct. " +
                "Key format: rzp_test_... or rzp_live_...",
                e.getMessage()
            );
            logger.error(errorMsg, e);
            throw new IllegalStateException(errorMsg, e);
        }
    }

    // expose secret so service can use it
    @Bean("razorpaySecret")
    public String razorpaySecret() {
        if (!StringUtils.hasText(secret)) {
            throw new IllegalStateException("Razorpay secret is not configured");
        }
        logger.info("Razorpay secret bean created (length: {})", secret.length());
        return secret;
    }
    
    // expose key for frontend
    @Bean("razorpayKey")
    public String razorpayKey() {
        if (!StringUtils.hasText(key)) {
            throw new IllegalStateException("Razorpay key is not configured");
        }
        logger.info("Razorpay key bean created: {}...", key.substring(0, Math.min(15, key.length())));
        return key;
    }
}
