package com.Startup.chalre.service;

import com.Startup.chalre.entity.Payment;
import com.Startup.chalre.entity.RefundOutbox;
import com.Startup.chalre.entity.RefundStatus;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.repository.PaymentRepository;
import com.Startup.chalre.repository.RefundOutboxRepository;
import com.razorpay.PaymentClient;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import org.json.JSONObject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class RefundWorkerServiceTest {

    @Mock
    private RefundOutboxRepository refundOutboxRepository;
    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private RazorpayClient razorpayClient;
    @Mock
    private PaymentClient paymentClient;
    @Mock
    private NotificationService notificationService;

    private RefundWorkerService refundWorkerService;

    private User passenger;
    private Payment payment;
    private RefundOutbox outbox;

    @BeforeEach
    void setUp() throws Exception {
        refundWorkerService = new RefundWorkerService(
                refundOutboxRepository,
                paymentRepository,
                razorpayClient,
                notificationService
        );

        // Inject paymentClient into razorpayClient.payments
        razorpayClient.payments = paymentClient;

        passenger = new User();
        passenger.setId(10L);
        passenger.setName("Alice");

        payment = new Payment();
        payment.setId(100L);
        payment.setUser(passenger);
        payment.setStatus(Payment.PaymentStatus.REFUND_PENDING);
        payment.setAmount(40000L);
        payment.setRazorpayPaymentId("pay_test_123");

        outbox = RefundOutbox.builder()
                .id(1L)
                .payment(payment)
                .razorpayPaymentId("pay_test_123")
                .amountPaise(40000L)
                .status(RefundStatus.PENDING)
                .idempotencyKey("rfnd_op_100_pay_test_123")
                .receipt("rcpt_100")
                .retryCount(0)
                .createdAt(LocalDateTime.now().minusMinutes(2))
                .build();

        // Default behavior: when claimLease is called, update the outbox claimToken
        when(refundOutboxRepository.claimLease(eq(1L), anyString(), any(LocalDateTime.class)))
                .thenAnswer(inv -> {
                    outbox.setClaimToken(inv.getArgument(1));
                    outbox.setStatus(RefundStatus.PROCESSING);
                    return 1;
                });
        when(refundOutboxRepository.findById(1L)).thenReturn(Optional.of(outbox));
    }

    @Test
    @DisplayName("1. Successful refund processes via gateway and updates outbox to CONFIRMED")
    void testSuccessfulRefund() throws Exception {
        when(refundOutboxRepository.findClaimableRefunds(any(), any(), anyInt(), any()))
                .thenReturn(List.of(outbox));

        // Reconciliation: no existing refund yet
        when(paymentClient.fetchAllRefunds("pay_test_123")).thenReturn(List.of());
        when(paymentClient.fetch("pay_test_123")).thenReturn(null);

        // Gateway refund call succeeds
        com.razorpay.Refund rzpRefund = mock(com.razorpay.Refund.class);
        when(rzpRefund.has("id")).thenReturn(true);
        when(rzpRefund.get("id")).thenReturn("rfnd_rzp_999");
        when(rzpRefund.has("status")).thenReturn(true);
        when(rzpRefund.get("status")).thenReturn("processed");
        when(paymentClient.refund(eq("pay_test_123"), any(JSONObject.class))).thenReturn(rzpRefund);

        refundWorkerService.processPendingRefunds();

        verify(paymentClient, times(1)).refund(eq("pay_test_123"), any(JSONObject.class));
        assertEquals(RefundStatus.CONFIRMED, outbox.getStatus());
        assertEquals("rfnd_rzp_999", outbox.getRazorpayRefundId());
        assertEquals(Payment.PaymentStatus.REFUNDED, payment.getStatus());
        assertNull(outbox.getClaimToken());
    }

    @Test
    @DisplayName("2. Duplicate worker invocation prevented by atomic CAS lease")
    void testDuplicateWorkerInvocation_AtomicCasLease() throws Exception {
        // Reset stub for claimLease: Worker 1 wins, Worker 2 loses
        when(refundOutboxRepository.claimLease(eq(1L), anyString(), any(LocalDateTime.class)))
                .thenReturn(1) // Worker 1 wins
                .thenReturn(0); // Worker 2 loses

        boolean worker1Claim = refundWorkerService.claimRefundJob(1L, "token_1");
        boolean worker2Claim = refundWorkerService.claimRefundJob(1L, "token_2");

        assertTrue(worker1Claim);
        assertFalse(worker2Claim);

        // Worker 2 should not execute gateway operations
        verify(paymentClient, never()).refund(anyString(), any());
    }

    @Test
    @DisplayName("3. Expired lease recovery resets stuck PROCESSING records to PENDING")
    void testExpiredLeaseRecovery() {
        when(refundOutboxRepository.releaseExpiredLeases(any(LocalDateTime.class))).thenReturn(3);

        refundWorkerService.processPendingRefunds();

        verify(refundOutboxRepository, times(1)).releaseExpiredLeases(any(LocalDateTime.class));
    }

    @Test
    @DisplayName("4. Crash after claim leaves job recoverable after lease threshold")
    void testCrashAfterClaim_LeaseRecovery() {
        // Job was claimed with token, but node crashed before calling gateway
        outbox.setStatus(RefundStatus.PROCESSING);
        outbox.setClaimToken("dead_worker_token");
        outbox.setClaimedAt(LocalDateTime.now().minusMinutes(10));

        when(refundOutboxRepository.releaseExpiredLeases(any(LocalDateTime.class))).thenAnswer(inv -> {
            outbox.setStatus(RefundStatus.PENDING);
            outbox.setClaimToken(null);
            return 1;
        });

        refundWorkerService.processPendingRefunds();

        verify(refundOutboxRepository, times(1)).releaseExpiredLeases(any(LocalDateTime.class));
        assertEquals(RefundStatus.PENDING, outbox.getStatus());
        assertNull(outbox.getClaimToken());
    }

    @Test
    @DisplayName("5. Crash after gateway acceptance: Reconciliation confirms without duplicate refund")
    void testCrashAfterGatewayAcceptance_ReconciliationConfirms() throws Exception {
        when(refundOutboxRepository.findClaimableRefunds(any(), any(), anyInt(), any()))
                .thenReturn(List.of(outbox));

        // Simulate gateway already has processed refund with matching receipt
        com.razorpay.Refund existingRefund = mock(com.razorpay.Refund.class);
        when(existingRefund.has("receipt")).thenReturn(true);
        when(existingRefund.get("receipt")).thenReturn("rcpt_100");
        when(existingRefund.has("id")).thenReturn(true);
        when(existingRefund.get("id")).thenReturn("rfnd_existing_444");
        when(existingRefund.has("status")).thenReturn(true);
        when(existingRefund.get("status")).thenReturn("processed");

        when(paymentClient.fetchAllRefunds("pay_test_123")).thenReturn(List.of(existingRefund));

        refundWorkerService.processPendingRefunds();

        // Must NOT call gateway refund() again!
        verify(paymentClient, never()).refund(anyString(), any(JSONObject.class));
        assertEquals(RefundStatus.CONFIRMED, outbox.getStatus());
        assertEquals("rfnd_existing_444", outbox.getRazorpayRefundId());
        assertEquals(Payment.PaymentStatus.REFUNDED, payment.getStatus());
    }

    @Test
    @DisplayName("6. Gateway timeout with uncertain outcome returns to PENDING for retry")
    void testGatewayTimeout_UncertainOutcomeRetried() throws Exception {
        when(refundOutboxRepository.findClaimableRefunds(any(), any(), anyInt(), any()))
                .thenReturn(List.of(outbox));

        outbox.setRetryCount(1); // 1st attempt

        when(paymentClient.fetchAllRefunds("pay_test_123")).thenReturn(List.of());
        when(paymentClient.fetch("pay_test_123")).thenReturn(null);

        when(paymentClient.refund(eq("pay_test_123"), any(JSONObject.class)))
                .thenThrow(new RazorpayException("SocketTimeoutException: Read timed out"));

        refundWorkerService.processPendingRefunds();

        // Must return to PENDING for retry, not mark terminal failure or double refund
        assertEquals(RefundStatus.PENDING, outbox.getStatus());
        assertNull(outbox.getClaimToken());
        assertTrue(outbox.getFailureReason().contains("RETRYABLE_ERROR"));
    }

    @Test
    @DisplayName("7. Duplicate refund scheduling handles outbox idempotently")
    void testDuplicateRefundScheduling() {
        when(refundOutboxRepository.findClaimableRefunds(any(), any(), anyInt(), any()))
                .thenReturn(List.of(outbox))
                .thenReturn(List.of()); // Second schedule finds nothing

        refundWorkerService.processPendingRefunds();
        refundWorkerService.processPendingRefunds();

        verify(refundOutboxRepository, times(1)).claimLease(eq(1L), anyString(), any(LocalDateTime.class));
    }

    @Test
    @DisplayName("8. Retry classification and bounded backoff handles terminal errors immediately")
    void testRetryClassification_TerminalError() throws Exception {
        when(refundOutboxRepository.findClaimableRefunds(any(), any(), anyInt(), any()))
                .thenReturn(List.of(outbox));

        when(paymentClient.fetchAllRefunds("pay_test_123")).thenReturn(List.of());
        when(paymentClient.refund(eq("pay_test_123"), any(JSONObject.class)))
                .thenThrow(new RazorpayException("The id provided does not exist"));

        refundWorkerService.processPendingRefunds();

        assertEquals(RefundStatus.FAILED_TERMINAL, outbox.getStatus());
        assertTrue(outbox.getFailureReason().contains("TERMINAL_FAILURE"));
        assertNull(outbox.getClaimToken());
    }

    @Test
    @DisplayName("9. Gateway-confirmed already-refunded response marks ALREADY_REFUNDED")
    void testGatewayConfirmedAlreadyRefundedResponse() throws Exception {
        when(refundOutboxRepository.findClaimableRefunds(any(), any(), anyInt(), any()))
                .thenReturn(List.of(outbox));

        when(paymentClient.fetchAllRefunds("pay_test_123")).thenReturn(List.of());
        when(paymentClient.refund(eq("pay_test_123"), any(JSONObject.class)))
                .thenThrow(new RazorpayException("The payment has already been refunded"));

        refundWorkerService.processPendingRefunds();

        assertEquals(RefundStatus.ALREADY_REFUNDED, outbox.getStatus());
        assertEquals(Payment.PaymentStatus.REFUNDED, payment.getStatus());
        assertNull(outbox.getClaimToken());
    }

    @Test
    @DisplayName("10. Manual-review handling when safe reconciliation is impossible after max retries")
    void testManualReviewHandling_MaxRetriesExceeded() throws Exception {
        when(refundOutboxRepository.findClaimableRefunds(any(), any(), anyInt(), any()))
                .thenReturn(List.of(outbox));

        outbox.setRetryCount(3); // Already at max retries

        when(paymentClient.fetchAllRefunds("pay_test_123")).thenReturn(List.of());
        when(paymentClient.refund(eq("pay_test_123"), any(JSONObject.class)))
                .thenThrow(new RazorpayException("Server error (500)"));

        refundWorkerService.processPendingRefunds();

        // Must escalate to MANUAL_REVIEW to prevent duplicate financial operations
        assertEquals(RefundStatus.MANUAL_REVIEW, outbox.getStatus());
        assertTrue(outbox.getFailureReason().contains("MANUAL_REVIEW"));
        assertNull(outbox.getClaimToken());
    }
}
