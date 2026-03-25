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
        if (!StringUtils.hasText(key) || !StringUtils.hasText(secret)) {
            throw new IllegalStateException(
                    "Razorpay keys not configured. Set RAZORPAY_KEY and RAZORPAY_SECRET."
            );
        }
        if (!key.startsWith("rzp_")) {
            throw new IllegalStateException(
                    "Invalid Razorpay key. Must start with rzp_"
            );
        }
        logger.info("Razorpay initializing with key: {}...",
                key.substring(0, Math.min(15, key.length())));
        RazorpayClient client = new RazorpayClient(key, secret);
        logger.info("Razorpay client ready");
        return client;
    }

    @Bean("razorpaySecret")
    public String razorpaySecret() {
        if (!StringUtils.hasText(secret)) {
            throw new IllegalStateException("Razorpay secret not configured");
        }
        return secret;
    }

    @Bean("razorpayKey")
    public String razorpayKey() {
        if (!StringUtils.hasText(key)) {
            throw new IllegalStateException("Razorpay key not configured");
        }
        return key;
    }
}