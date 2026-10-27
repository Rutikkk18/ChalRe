package com.Startup.chalre.service;

import com.Startup.chalre.DTO.PaymentFinalizationCommand;
import com.Startup.chalre.DTO.PaymentFinalizationResult;
import com.Startup.chalre.controller.PaymentWebhookController;
import com.Startup.chalre.entity.*;
import com.Startup.chalre.repository.SeatHoldRepository;
import com.Startup.chalre.repository.WebhookEventRepository;
import org.json.JSONObject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class PaymentWebhookIntegrationTest {

    @Mock
    private WebhookEventRepository webhookEventRepository;
    @Mock
    private PaymentFinalizationService paymentFinalizationService;
    @Mock
    private SeatHoldRepository seatHoldRepository;

    private WebhookService webhookService;
    private PaymentWebhookController webhookController;
    private WebhookEventWorker webhookWorker;

    private static final String TEST_WEBHOOK_SECRET = "whsec_test_secret_key_88888";

    private Ride ride;
    private User passenger;
    private SeatHold hold;

    @BeforeEach
    void setUp() {
        webhookService = new WebhookService(webhookEventRepository);
        webhookController = new PaymentWebhookController(webhookService, TEST_WEBHOOK_SECRET);
        webhookWorker = new WebhookEventWorker(
                webhookEventRepository,
                paymentFinalizationService,
                seatHoldRepository
        );

        passenger = new User();
        passenger.setId(5L);
        passenger.setName("Bob");

        ride = new Ride();
        ride.setId(105L);
        ride.setAvailableSeats(2);

        hold = SeatHold.builder()
                .id(77L)
                .ride(ride)
                .user(passenger)
                .seatsHeld(1)
                .razorpayOrderId("order_webhook_123")
                .status(SeatHoldStatus.HELD)
                .expiresAt(LocalDateTime.now().plusMinutes(5))
                .build();
    }

    private String calculateSignature(String payload, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("HMAC computation failed", e);
        }
    }

    private String createSamplePayload(String eventId, String eventType, String paymentId, String orderId, long amount, String currency) {
        return "{\n" +
                "  \"entity\": \"event\",\n" +
                "  \"id\": \"" + eventId + "\",\n" +
                "  \"event\": \"" + eventType + "\",\n" +
                "  \"payload\": {\n" +
                "    \"payment\": {\n" +
                "      \"entity\": {\n" +
                "        \"id\": \"" + paymentId + "\",\n" +
                "        \"order_id\": \"" + orderId + "\",\n" +
                "        \"amount\": " + amount + ",\n" +
                "        \"currency\": \"" + currency + "\",\n" +
                "        \"status\": \"captured\"\n" +
                "      }\n" +
                "    },\n" +
                "    \"order\": {\n" +
                "      \"entity\": {\n" +
                "        \"id\": \"" + orderId + "\",\n" +
                "        \"status\": \"paid\"\n" +
                "      }\n" +
                "    }\n" +
                "  }\n" +
                "}";
    }

    @Test
    @DisplayName("11. Valid webhook signature is accepted and event is persisted as RECEIVED")
    void testValidSignatureAcceptance() {
        String payload = createSamplePayload("evt_101", "payment.captured", "pay_101", "order_webhook_123", 40000L, "INR");
        String signature = calculateSignature(payload, TEST_WEBHOOK_SECRET);

        when(webhookEventRepository.findByEventId("evt_101")).thenReturn(Optional.empty());

        ResponseEntity<?> response = webhookController.handleRazorpayWebhook(signature, null, payload);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(webhookEventRepository, times(1)).save(argThat(event ->
                "evt_101".equals(event.getEventId()) &&
                WebhookStatus.RECEIVED.equals(event.getStatus()) &&
                "payment.captured".equals(event.getEventType())
        ));
    }

    @Test
    @DisplayName("12. Invalid webhook signature is rejected with 401 Unauthorized")
    void testInvalidSignatureRejection() {
        String payload = createSamplePayload("evt_102", "payment.captured", "pay_102", "order_webhook_123", 40000L, "INR");
        String invalidSignature = "invalid_signature_hex_value_12345";

        ResponseEntity<?> response = webhookController.handleRazorpayWebhook(invalidSignature, null, payload);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        verify(webhookEventRepository, never()).save(any(WebhookEvent.class));
    }

    @Test
    @DisplayName("13. Exact raw-body signature verification detects tampering")
    void testExactRawBodySignatureVerification_DetectsTampering() {
        String originalPayload = createSamplePayload("evt_103", "payment.captured", "pay_103", "order_webhook_123", 40000L, "INR");
        String signature = calculateSignature(originalPayload, TEST_WEBHOOK_SECRET);

        // Tamper with payload (e.g. change amount from 40000 to 10000)
        String tamperedPayload = createSamplePayload("evt_103", "payment.captured", "pay_103", "order_webhook_123", 10000L, "INR");

        ResponseEntity<?> response = webhookController.handleRazorpayWebhook(signature, null, tamperedPayload);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        verify(webhookEventRepository, never()).save(any(WebhookEvent.class));
    }

    @Test
    @DisplayName("14. Duplicate event ID returns HTTP 200 without duplicate persistence")
    void testDuplicateEventId_AcknowledgesWithoutDuplicate() {
        String payload = createSamplePayload("evt_dup", "payment.captured", "pay_dup", "order_webhook_123", 40000L, "INR");
        String signature = calculateSignature(payload, TEST_WEBHOOK_SECRET);

        WebhookEvent existing = WebhookEvent.builder()
                .id(20L)
                .eventId("evt_dup")
                .eventType("payment.captured")
                .status(WebhookStatus.PROCESSED)
                .build();

        when(webhookEventRepository.findByEventId("evt_dup")).thenReturn(Optional.of(existing));

        ResponseEntity<?> response = webhookController.handleRazorpayWebhook(signature, null, payload);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        // Verify save was never called for duplicate
        verify(webhookEventRepository, never()).save(any(WebhookEvent.class));
    }

    @Test
    @DisplayName("15. Duplicate delivery while first event is PROCESSING acknowledges safely")
    void testDuplicateDeliveryWhileProcessing() {
        String payload = createSamplePayload("evt_in_flight", "payment.captured", "pay_in_flight", "order_webhook_123", 40000L, "INR");
        String signature = calculateSignature(payload, TEST_WEBHOOK_SECRET);

        WebhookEvent processingEvent = WebhookEvent.builder()
                .id(25L)
                .eventId("evt_in_flight")
                .eventType("payment.captured")
                .status(WebhookStatus.PROCESSING)
                .claimToken("token_active")
                .build();

        when(webhookEventRepository.findByEventId("evt_in_flight")).thenReturn(Optional.of(processingEvent));

        ResponseEntity<?> response = webhookController.handleRazorpayWebhook(signature, null, payload);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(webhookEventRepository, never()).save(any(WebhookEvent.class));
    }

    @Test
    @DisplayName("16. Crash after finalization but before marking event PROCESSED is idempotent on replay")
    void testCrashAfterFinalization_IdempotentReplay() {
        String payload = createSamplePayload("evt_replay", "payment.captured", "pay_replay", "order_webhook_123", 40000L, "INR");

        WebhookEvent event = WebhookEvent.builder()
                .id(30L)
                .eventId("evt_replay")
                .eventType("payment.captured")
                .payload(payload)
                .status(WebhookStatus.PROCESSING)
                .claimToken("token_replay")
                .build();

        when(webhookEventRepository.findById(30L)).thenReturn(Optional.of(event));
        when(seatHoldRepository.findByRazorpayOrderId("order_webhook_123")).thenReturn(Optional.of(hold));

        // Finalization engine returns alreadyProcessed=true on replay
        PaymentFinalizationResult idempotentResult = PaymentFinalizationResult.builder()
                .success(true)
                .alreadyProcessed(true)
                .bookingId(99L)
                .paymentId(88L)
                .status("SUCCESS")
                .build();
        when(paymentFinalizationService.finalizePaymentAndBooking(any(PaymentFinalizationCommand.class), isNull()))
                .thenReturn(idempotentResult);

        webhookWorker.processSingleEvent(30L, "token_replay");

        assertEquals(WebhookStatus.PROCESSED, event.getStatus());
        assertNull(event.getClaimToken());
        assertNotNull(event.getProcessedAt());
        verify(webhookEventRepository, times(1)).save(event);
    }

    @Test
    @DisplayName("17. Out-of-order unrelated webhook events are safely marked IGNORED")
    void testOutOfOrderOrUnrelatedEvents_SafelyIgnored() {
        String payload = "{\n" +
                "  \"id\": \"evt_dispute\",\n" +
                "  \"event\": \"dispute.created\",\n" +
                "  \"payload\": {}\n" +
                "}";

        WebhookEvent event = WebhookEvent.builder()
                .id(35L)
                .eventId("evt_dispute")
                .eventType("dispute.created")
                .payload(payload)
                .status(WebhookStatus.PROCESSING)
                .claimToken("token_ignored")
                .build();

        when(webhookEventRepository.findById(35L)).thenReturn(Optional.of(event));

        webhookWorker.processSingleEvent(35L, "token_ignored");

        assertEquals(WebhookStatus.IGNORED, event.getStatus());
        assertNull(event.getClaimToken());
        verify(paymentFinalizationService, never()).finalizePaymentAndBooking(any(), any());
    }

    @Test
    @DisplayName("18. Mismatched currency (non-INR) is rejected and marked FAILED")
    void testMismatchedCurrency_Rejection() {
        String payloadUSD = createSamplePayload("evt_usd", "payment.captured", "pay_usd", "order_webhook_123", 40000L, "USD");

        WebhookEvent event = WebhookEvent.builder()
                .id(40L)
                .eventId("evt_usd")
                .eventType("payment.captured")
                .payload(payloadUSD)
                .status(WebhookStatus.PROCESSING)
                .claimToken("token_usd")
                .build();

        when(webhookEventRepository.findById(40L)).thenReturn(Optional.of(event));

        webhookWorker.processSingleEvent(40L, "token_usd");

        assertEquals(WebhookStatus.FAILED, event.getStatus());
        assertNull(event.getClaimToken());
        verify(paymentFinalizationService, never()).finalizePaymentAndBooking(any(), any());
    }

    @Test
    @DisplayName("19. Recovery of stalled webhook events resets expired leases back to RECEIVED")
    void testRecoveryOfStalledWebhookEvents() {
        when(webhookEventRepository.releaseExpiredLeases(any(LocalDateTime.class))).thenReturn(2);

        webhookWorker.processPendingEvents();

        verify(webhookEventRepository, times(1)).releaseExpiredLeases(any(LocalDateTime.class));
    }

    @Test
    @DisplayName("20. Multiple workers competing for the same event: Atomic CAS lease ensures exactly one worker processes")
    void testMultipleWorkersCompetingForSameEvent() {
        when(webhookEventRepository.claimLease(eq(50L), anyString(), any(LocalDateTime.class)))
                .thenReturn(1) // Worker 1 wins
                .thenReturn(0); // Worker 2 loses

        boolean worker1 = webhookWorker.claimWebhookEvent(50L, "worker_1_token");
        boolean worker2 = webhookWorker.claimWebhookEvent(50L, "worker_2_token");

        assertTrue(worker1);
        assertFalse(worker2);
    }
}
