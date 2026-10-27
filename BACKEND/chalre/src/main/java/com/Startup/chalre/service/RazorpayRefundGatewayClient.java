package com.Startup.chalre.service;

import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;

/**
 * Thread-safe HTTP gateway client for issuing Razorpay refunds with
 * official X-Refund-Idempotency header support.
 *
 * Avoids mutating headers on the shared singleton RazorpayClient instance.
 */
@Component
public class RazorpayRefundGatewayClient {

    private static final Logger logger = LoggerFactory.getLogger(RazorpayRefundGatewayClient.class);

    private final String razorpayKey;
    private final String razorpaySecret;
    private final HttpClient httpClient;

    public enum GatewayRefundResultType {
        CONFIRMED,
        ALREADY_REFUNDED,
        IN_PROGRESS,
        TERMINAL_FAILURE,
        RETRYABLE_ERROR
    }

    public record GatewayRefundResult(
            GatewayRefundResultType type,
            String razorpayRefundId,
            String errorMessage
    ) {
        public static GatewayRefundResult confirmed(String refundId) {
            return new GatewayRefundResult(GatewayRefundResultType.CONFIRMED, refundId, null);
        }

        public static GatewayRefundResult alreadyRefunded() {
            return new GatewayRefundResult(GatewayRefundResultType.ALREADY_REFUNDED, null, null);
        }

        public static GatewayRefundResult inProgress() {
            return new GatewayRefundResult(GatewayRefundResultType.IN_PROGRESS, null,
                    "Gateway conflict (409): refund request with this idempotency key is already in progress.");
        }

        public static GatewayRefundResult terminalFailure(String msg) {
            return new GatewayRefundResult(GatewayRefundResultType.TERMINAL_FAILURE, null, msg);
        }

        public static GatewayRefundResult retryable(String msg) {
            return new GatewayRefundResult(GatewayRefundResultType.RETRYABLE_ERROR, null, msg);
        }
    }

    @Autowired
    public RazorpayRefundGatewayClient(
            @Qualifier("razorpayKey") String razorpayKey,
            @Qualifier("razorpaySecret") String razorpaySecret) {
        this.razorpayKey = razorpayKey;
        this.razorpaySecret = razorpaySecret;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    /**
     * Package-private constructor for unit testing with custom HttpClient.
     */
    RazorpayRefundGatewayClient(String razorpayKey, String razorpaySecret, HttpClient httpClient) {
        this.razorpayKey = razorpayKey;
        this.razorpaySecret = razorpaySecret;
        this.httpClient = httpClient;
    }

    /**
     * Executes refund request over HTTP with official X-Refund-Idempotency header.
     */
    public GatewayRefundResult executeRefundWithIdempotency(
            String paymentId,
            long amountPaise,
            String receipt,
            String idempotencyKey,
            Long outboxId) {
        try {
            JSONObject body = new JSONObject();
            body.put("amount", amountPaise);
            body.put("receipt", receipt);

            JSONObject notes = new JSONObject();
            notes.put("idempotency_key", idempotencyKey);
            notes.put("outbox_id", String.valueOf(outboxId));
            body.put("notes", notes);

            String auth = Base64.getEncoder().encodeToString(
                    (razorpayKey + ":" + razorpaySecret).getBytes(StandardCharsets.UTF_8)
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.razorpay.com/v1/payments/" + paymentId + "/refund"))
                    .timeout(Duration.ofSeconds(15))
                    .header("Authorization", "Basic " + auth)
                    .header("Content-Type", "application/json")
                    .header("X-Refund-Idempotency", idempotencyKey)
                    .POST(HttpRequest.BodyPublishers.ofString(body.toString(), StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            int statusCode = response.statusCode();
            String responseBody = response.body();

            if (statusCode == 200 || statusCode == 201) {
                JSONObject json = new JSONObject(responseBody);
                String refundId = json.optString("id", null);
                return GatewayRefundResult.confirmed(refundId);
            } else if (statusCode == 409) {
                // Conflict: duplicate request with same idempotency key is already in flight or processed
                logger.info("Razorpay returned HTTP 409 for idempotency key {}. Refund is in progress.", idempotencyKey);
                return GatewayRefundResult.inProgress();
            } else if (statusCode == 400) {
                String errorDesc = "";
                try {
                    JSONObject errJson = new JSONObject(responseBody);
                    JSONObject err = errJson.optJSONObject("error");
                    errorDesc = err != null ? err.optString("description", "") : "";
                } catch (Exception ignored) {}

                String lower = errorDesc.toLowerCase();
                if (lower.contains("already been refunded") ||
                        lower.contains("fully refunded") ||
                        lower.contains("allowable refundable amount")) {
                    return GatewayRefundResult.alreadyRefunded();
                } else if (lower.contains("does not exist") ||
                        lower.contains("invalid payment") ||
                        lower.contains("voided")) {
                    return GatewayRefundResult.terminalFailure(errorDesc);
                } else {
                    return GatewayRefundResult.retryable("HTTP 400: " + errorDesc);
                }
            } else if (statusCode >= 500) {
                return GatewayRefundResult.retryable("Gateway server error: HTTP " + statusCode);
            } else {
                return GatewayRefundResult.retryable("Unexpected HTTP status: " + statusCode);
            }
        } catch (Exception e) {
            logger.warn("Exception during idempotent refund HTTP call for payment {}: {}", paymentId, e.getMessage());
            return GatewayRefundResult.retryable(e.getMessage());
        }
    }
}
