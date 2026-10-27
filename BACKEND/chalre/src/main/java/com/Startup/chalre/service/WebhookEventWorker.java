package com.Startup.chalre.service;

import com.Startup.chalre.DTO.PaymentFinalizationCommand;
import com.Startup.chalre.DTO.PaymentFinalizationResult;
import com.Startup.chalre.entity.SeatHold;
import com.Startup.chalre.entity.WebhookEvent;
import com.Startup.chalre.entity.WebhookStatus;
import com.Startup.chalre.repository.SeatHoldRepository;
import com.Startup.chalre.repository.WebhookEventRepository;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class WebhookEventWorker {

    private static final Logger logger = LoggerFactory.getLogger(WebhookEventWorker.class);

    private final WebhookEventRepository webhookEventRepository;
    private final PaymentFinalizationService paymentFinalizationService;
    private final SeatHoldRepository seatHoldRepository;

    @Value("${chalre.webhook.worker.lease-minutes:5}")
    private int leaseDurationMinutes = 5;

    @Value("${chalre.webhook.worker.retry-backoff-seconds:30}")
    private int retryBackoffSeconds = 30;

    public WebhookEventWorker(
            WebhookEventRepository webhookEventRepository,
            PaymentFinalizationService paymentFinalizationService,
            SeatHoldRepository seatHoldRepository) {
        this.webhookEventRepository = webhookEventRepository;
        this.paymentFinalizationService = paymentFinalizationService;
        this.seatHoldRepository = seatHoldRepository;
    }

    /**
     * Periodic scheduled processor for durable WebhookEvent records.
     * Recovers stalled/crashed leases and processes events safely across multiple nodes.
     */
    @Scheduled(fixedDelayString = "${chalre.webhook.worker.delay-ms:5000}", initialDelay = 3000)
    public int processPendingEvents() {
        try {
            // 1. Recover expired leases for crashed or stalled workers
            LocalDateTime leaseThreshold = LocalDateTime.now().minusMinutes(leaseDurationMinutes);
            int releasedCount = webhookEventRepository.releaseExpiredLeases(leaseThreshold);
            if (releasedCount > 0) {
                logger.warn("Released {} expired webhook worker leases back to RECEIVED", releasedCount);
            }

            // 2. Fetch recoverable events (RECEIVED, or FAILED past retry threshold)
            LocalDateTime retryThreshold = LocalDateTime.now().minusSeconds(retryBackoffSeconds);
            List<WebhookEvent> candidates = webhookEventRepository.findRecoverableEvents(
                    leaseThreshold,
                    retryThreshold,
                    PageRequest.of(0, 10)
            );

            if (candidates.isEmpty()) {
                return 0;
            }

            int processedCount = 0;
            for (WebhookEvent candidate : candidates) {
                String claimToken = UUID.randomUUID().toString();
                boolean claimed = claimWebhookEvent(candidate.getId(), claimToken);
                if (!claimed) {
                    continue; // Contended by another worker instance
                }

                processSingleEvent(candidate.getId(), claimToken);
                processedCount++;
            }

            return processedCount;
        } catch (Exception e) {
            logger.error("Error during webhook worker execution cycle: {}", e.getMessage(), e);
            return 0;
        }
    }

    /**
     * Atomically claims an exclusive lease for this webhook event.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean claimWebhookEvent(Long eventId, String claimToken) {
        int updated = webhookEventRepository.claimLease(eventId, claimToken, LocalDateTime.now());
        return updated > 0;
    }

    /**
     * Authoritatively processes a single claimed webhook event.
     */
    public void processSingleEvent(Long eventRecordId, String claimToken) {
        WebhookEvent event = webhookEventRepository.findById(eventRecordId).orElse(null);
        if (event == null || !claimToken.equals(event.getClaimToken())) {
            logger.warn("Webhook event {} lease lost or claimed elsewhere. Skipping.", eventRecordId);
            return;
        }

        String eventType = event.getEventType();
        logger.info("Processing webhook event: id={}, eventId={}, type={}",
                eventRecordId, event.getEventId(), eventType);

        try {
            // Filter non-payment events safely with auditability
            if (!"payment.captured".equals(eventType) && !"order.paid".equals(eventType)) {
                logger.info("Ignoring non-payment webhook event type: {}", eventType);
                finalizeEventStatus(eventRecordId, claimToken, WebhookStatus.IGNORED, null);
                return;
            }

            JSONObject payloadJson = new JSONObject(event.getPayload());
            JSONObject payloadObj = payloadJson.optJSONObject("payload");
            if (payloadObj == null) {
                logger.error("Malformed webhook payload structure in event {}", eventRecordId);
                finalizeEventStatus(eventRecordId, claimToken, WebhookStatus.FAILED, "Missing payload object");
                return;
            }

            JSONObject paymentObj = payloadObj.optJSONObject("payment");
            JSONObject paymentEntity = paymentObj != null ? paymentObj.optJSONObject("entity") : null;

            JSONObject orderObj = payloadObj.optJSONObject("order");
            JSONObject orderEntity = orderObj != null ? orderObj.optJSONObject("entity") : null;

            if (paymentEntity == null) {
                logger.error("Webhook event {} contains no payment entity", eventRecordId);
                finalizeEventStatus(eventRecordId, claimToken, WebhookStatus.FAILED, "Missing payment.entity in payload");
                return;
            }

            String paymentId = paymentEntity.optString("id", null);
            String orderId = paymentEntity.optString("order_id", orderEntity != null ? orderEntity.optString("id", null) : null);
            String currency = paymentEntity.optString("currency", "INR");
            long amountPaise = paymentEntity.optLong("amount", 0L);
            String paymentStatus = paymentEntity.optString("status", null);

            // Validation of gateway payload
            if (!"INR".equalsIgnoreCase(currency)) {
                logger.error("Invalid currency {} in webhook payment {}", currency, paymentId);
                finalizeEventStatus(eventRecordId, claimToken, WebhookStatus.FAILED, "Unsupported currency: " + currency);
                return;
            }

            if (amountPaise <= 0) {
                logger.error("Invalid amount {} in webhook payment {}", amountPaise, paymentId);
                finalizeEventStatus(eventRecordId, claimToken, WebhookStatus.FAILED, "Invalid amount");
                return;
            }

            if (orderId == null || orderId.isBlank()) {
                logger.error("Missing order ID in webhook payment {}", paymentId);
                finalizeEventStatus(eventRecordId, claimToken, WebhookStatus.FAILED, "Missing order ID");
                return;
            }

            // Verify payment capture status
            if (!"captured".equalsIgnoreCase(paymentStatus) && !"order.paid".equals(eventType)) {
                logger.warn("Webhook payment {} is in non-captured status: {}", paymentId, paymentStatus);
                finalizeEventStatus(eventRecordId, claimToken, WebhookStatus.FAILED, "Payment not captured");
                return;
            }

            // Authoritative association with persisted SeatHold
            Optional<SeatHold> holdOpt = seatHoldRepository.findByRazorpayOrderId(orderId);
            Long rideId = null;
            Integer seats = null;
            Long userId = null;

            if (holdOpt.isPresent()) {
                SeatHold hold = holdOpt.get();
                rideId = hold.getRide().getId();
                seats = hold.getSeatsHeld();
                userId = hold.getUser().getId();
            } else {
                // Fallback check in payment notes if available
                JSONObject notes = paymentEntity.optJSONObject("notes");
                if (notes != null) {
                    rideId = notes.has("ride_id") ? notes.optLong("ride_id") : null;
                    seats = notes.has("seats") ? notes.optInt("seats") : null;
                    userId = notes.has("user_id") ? notes.optLong("user_id") : null;
                }
            }

            if (rideId == null || seats == null || userId == null) {
                logger.error("Cannot resolve ride, seats, or user for webhook order {}", orderId);
                finalizeEventStatus(eventRecordId, claimToken, WebhookStatus.FAILED, "Unresolvable checkout metadata for order " + orderId);
                return;
            }

            // Reuse PaymentFinalizationService as single authoritative engine
            PaymentFinalizationCommand cmd = PaymentFinalizationCommand.builder()
                    .razorpayPaymentId(paymentId)
                    .razorpayOrderId(orderId)
                    .amountPaise(amountPaise)
                    .rideId(rideId)
                    .seats(seats)
                    .userId(userId)
                    .signaturePreVerified(true) // Pre-verified by outer webhook signature
                    .build();

            PaymentFinalizationResult result = paymentFinalizationService.finalizePaymentAndBooking(cmd, null);
            logger.info("Webhook event {} finalization completed: success={}, status={}, alreadyProcessed={}",
                    eventRecordId, result.isSuccess(), result.getStatus(), result.isAlreadyProcessed());

            finalizeEventStatus(eventRecordId, claimToken, WebhookStatus.PROCESSED, null);

        } catch (Exception ex) {
            logger.error("Exception processing webhook event {}: {}", eventRecordId, ex.getMessage(), ex);
            finalizeEventStatus(eventRecordId, claimToken, WebhookStatus.FAILED, ex.getMessage());
        }
    }

    /**
     * Updates event status and processed timestamp in short isolated transaction.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void finalizeEventStatus(Long eventRecordId, String claimToken, WebhookStatus status, String note) {
        WebhookEvent event = webhookEventRepository.findById(eventRecordId).orElse(null);
        if (event == null || (claimToken != null && !claimToken.equals(event.getClaimToken()))) {
            return;
        }

        event.setStatus(status);
        event.setClaimToken(null);
        event.setLastAttemptAt(LocalDateTime.now());
        if (WebhookStatus.PROCESSED.equals(status) || WebhookStatus.IGNORED.equals(status)) {
            event.setProcessedAt(LocalDateTime.now());
        }

        webhookEventRepository.save(event);
        logger.info("Webhook event {} updated to {}", eventRecordId, status);
    }
}
