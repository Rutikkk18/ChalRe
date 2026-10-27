package com.Startup.chalre.controller;

import com.Startup.chalre.service.WebhookService;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

@RestController
@RequestMapping("/api/webhooks")
public class PaymentWebhookController {

    private static final Logger logger = LoggerFactory.getLogger(PaymentWebhookController.class);

    private final WebhookService webhookService;
    private final String webhookSecret;

    public PaymentWebhookController(
            WebhookService webhookService,
            @Qualifier("razorpayWebhookSecret") String webhookSecret) {
        this.webhookService = webhookService;
        this.webhookSecret = webhookSecret;
    }

    /**
     * Receives and verifies Razorpay webhook events.
     * Uses exact raw request body string for HMAC-SHA256 signature verification.
     * Persists accepted events durably before returning HTTP 200 acknowledgment.
     */
    @PostMapping(value = "/razorpay", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> handleRazorpayWebhook(
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature,
            @RequestHeader(value = "X-Razorpay-Event-Id", required = false) String headerEventId,
            @RequestBody String rawPayload) {

        if (signature == null || signature.isBlank()) {
            logger.warn("Webhook rejected: missing X-Razorpay-Signature header");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Missing signature"));
        }

        if (webhookSecret == null || webhookSecret.isBlank()) {
            logger.error("Webhook secret is not configured on the server. Rejecting webhook.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Webhook secret unconfigured"));
        }

        // 1. Authenticity check: Exact raw-body HMAC-SHA256 signature verification
        boolean signatureValid = verifyWebhookSignature(rawPayload, signature, webhookSecret);
        if (!signatureValid) {
            logger.warn("Webhook rejected: HMAC signature verification failed");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid signature"));
        }

        // 2. Parse top-level event metadata
        String eventId;
        String eventType;
        try {
            JSONObject json = new JSONObject(rawPayload);
            eventId = headerEventId != null && !headerEventId.isBlank()
                    ? headerEventId
                    : json.optString("id", json.optString("event_id", null));
            eventType = json.optString("event", null);

            if (eventId == null || eventId.isBlank() || eventType == null || eventType.isBlank()) {
                logger.warn("Webhook payload missing required event or eventId fields");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Malformed webhook payload"));
            }
        } catch (Exception e) {
            logger.warn("Failed to parse webhook JSON metadata: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Malformed JSON"));
        }

        // 3. Durable persistence & deduplication before acknowledging
        try {
            boolean isNew = webhookService.ingestWebhookEvent(eventId, eventType, rawPayload);
            return ResponseEntity.ok(Map.of(
                    "status", "acknowledged",
                    "eventId", eventId,
                    "action", isNew ? "persisted" : "duplicate_acknowledged"
            ));
        } catch (Exception ex) {
            logger.error("Failed to durably ingest webhook event {}: {}", eventId, ex.getMessage(), ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Persistence failure"));
        }
    }

    /**
     * Verifies the Razorpay webhook signature against the raw request body using constant-time comparison.
     */
    private boolean verifyWebhookSignature(String rawBody, String signature, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(rawBody.getBytes(StandardCharsets.UTF_8));

            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            String calculatedSignature = hexString.toString();

            // Constant-time comparison to prevent timing attacks
            return MessageDigest.isEqual(
                    calculatedSignature.getBytes(StandardCharsets.UTF_8),
                    signature.trim().getBytes(StandardCharsets.UTF_8)
            );
        } catch (Exception e) {
            logger.error("Error computing webhook HMAC signature: {}", e.getMessage());
            return false;
        }
    }
}
