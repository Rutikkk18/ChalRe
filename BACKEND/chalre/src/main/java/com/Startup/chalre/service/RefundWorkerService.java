package com.Startup.chalre.service;

import com.Startup.chalre.entity.Payment;
import com.Startup.chalre.entity.RefundOutbox;
import com.Startup.chalre.entity.RefundStatus;
import com.Startup.chalre.repository.PaymentRepository;
import com.Startup.chalre.repository.RefundOutboxRepository;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
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
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class RefundWorkerService {

    private static final Logger logger = LoggerFactory.getLogger(RefundWorkerService.class);

    private final RefundOutboxRepository refundOutboxRepository;
    private final PaymentRepository paymentRepository;
    private final RazorpayClient razorpayClient;
    private final NotificationService notificationService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private RazorpayRefundGatewayClient refundGatewayClient;

    public void setRefundGatewayClient(RazorpayRefundGatewayClient refundGatewayClient) {
        this.refundGatewayClient = refundGatewayClient;
    }

    @Value("${chalre.refund.worker.max-retries:3}")
    private int maxRetries = 3;

    @Value("${chalre.refund.worker.lease-minutes:5}")
    private int leaseDurationMinutes = 5;

    @Value("${chalre.refund.worker.base-backoff-seconds:30}")
    private int baseBackoffSeconds = 30;

    public RefundWorkerService(
            RefundOutboxRepository refundOutboxRepository,
            PaymentRepository paymentRepository,
            RazorpayClient razorpayClient,
            NotificationService notificationService) {
        this.refundOutboxRepository = refundOutboxRepository;
        this.paymentRepository = paymentRepository;
        this.razorpayClient = razorpayClient;
        this.notificationService = notificationService;
    }

    /**
     * Periodic scheduled runner for durable refund outbox processing.
     * Recovers expired leases, claims pending jobs using atomic CAS leases,
     * and executes gateway operations strictly outside database transactions.
     */
    @Scheduled(fixedDelayString = "${chalre.refund.worker.delay-ms:10000}", initialDelay = 5000)
    public int processPendingRefunds() {
        try {
            // 1. Recover expired worker leases safely across all instances
            LocalDateTime leaseThreshold = LocalDateTime.now().minusMinutes(leaseDurationMinutes);
            int releasedCount = refundOutboxRepository.releaseExpiredLeases(leaseThreshold);
            if (releasedCount > 0) {
                logger.warn("Released {} expired refund worker leases stuck in PROCESSING", releasedCount);
            }

            // 2. Query claimable candidates honoring retry backoff
            LocalDateTime backoffThreshold = LocalDateTime.now().minusSeconds(baseBackoffSeconds);
            List<RefundOutbox> candidates = refundOutboxRepository.findClaimableRefunds(
                    RefundStatus.PENDING,
                    backoffThreshold,
                    maxRetries,
                    PageRequest.of(0, 10)
            );

            if (candidates.isEmpty()) {
                return 0;
            }

            int processedCount = 0;
            for (RefundOutbox candidate : candidates) {
                String claimToken = UUID.randomUUID().toString();
                boolean claimed = claimRefundJob(candidate.getId(), claimToken);
                if (!claimed) {
                    // Contended by another node or thread
                    continue;
                }

                // Execute the refund job strictly outside any DB locks or transactions
                processSingleRefund(candidate.getId(), claimToken);
                processedCount++;
            }

            return processedCount;
        } catch (Exception e) {
            logger.error("Error during refund worker execution cycle: {}", e.getMessage(), e);
            return 0;
        }
    }

    /**
     * Atomically claims an exclusive worker lease for this outbox item.
     * Uses short isolated transaction with atomic database CAS.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean claimRefundJob(Long outboxId, String claimToken) {
        int updated = refundOutboxRepository.claimLease(outboxId, claimToken, LocalDateTime.now());
        return updated > 0;
    }

    /**
     * Processes a single claimed refund job.
     * CRITICAL SAFETY: External network calls to Razorpay execute OUTSIDE database transactions.
     */
    public void processSingleRefund(Long outboxId, String claimToken) {
        RefundOutbox outbox = refundOutboxRepository.findById(outboxId).orElse(null);
        if (outbox == null || !claimToken.equals(outbox.getClaimToken())) {
            logger.warn("Refund job {} lease expired or claimed by another worker. Skipping.", outboxId);
            return;
        }

        String paymentId = outbox.getRazorpayPaymentId();
        Long amountPaise = outbox.getAmountPaise();
        String receipt = outbox.getReceipt();
        String idempotencyKey = outbox.getIdempotencyKey();

        logger.info("Processing refund job {}: paymentId={}, amount={} paise, attempt={}/{}",
                outboxId, paymentId, amountPaise, outbox.getRetryCount(), maxRetries);

        try {
            // ── STEP 1: Gateway Reconciliation ──
            // Before issuing a refund request, reconcile whether an earlier attempt already reached Razorpay
            com.razorpay.Refund existingConfirmedRefund = reconcileExistingGatewayRefund(paymentId, receipt, idempotencyKey);
            if (existingConfirmedRefund != null) {
                String refundStatus = existingConfirmedRefund.has("status") ? existingConfirmedRefund.get("status").toString() : "";
                String refId = existingConfirmedRefund.has("id") ? existingConfirmedRefund.get("id").toString() : null;
                if ("processed".equalsIgnoreCase(refundStatus)) {
                    logger.info("Reconciliation found already processed refund {} for payment {}.",
                            refId, paymentId);
                    finalizeRefundResult(outboxId, claimToken, refId, RefundStatus.CONFIRMED, null);
                    return;
                } else if ("pending".equalsIgnoreCase(refundStatus)) {
                    logger.info("Reconciliation found refund {} in pending state at Razorpay. Rescheduling check.",
                            refId);
                    handlePendingGatewayOutcome(outboxId, claimToken, refId);
                    return;
                }
            }

            // Check if payment was already marked fully refunded at gateway level
            if (isPaymentAlreadyRefundedAtGateway(paymentId, amountPaise)) {
                logger.info("Gateway payment {} confirms amount already fully refunded. Marking ALREADY_REFUNDED.", paymentId);
                finalizeRefundResult(outboxId, claimToken, null, RefundStatus.ALREADY_REFUNDED, null);
                return;
            }

            // ── STEP 2: Issue Razorpay Refund API Call ──
            if (refundGatewayClient != null) {
                RazorpayRefundGatewayClient.GatewayRefundResult res = refundGatewayClient.executeRefundWithIdempotency(
                        paymentId, amountPaise, receipt, idempotencyKey, outboxId
                );
                switch (res.type()) {
                    case CONFIRMED -> finalizeRefundResult(outboxId, claimToken, res.razorpayRefundId(), RefundStatus.CONFIRMED, null);
                    case ALREADY_REFUNDED -> finalizeRefundResult(outboxId, claimToken, null, RefundStatus.ALREADY_REFUNDED, null);
                    case IN_PROGRESS -> handlePendingGatewayOutcome(outboxId, claimToken, null);
                    case TERMINAL_FAILURE -> markTerminalFailure(outboxId, claimToken, res.errorMessage());
                    case RETRYABLE_ERROR -> handleFailureOrManualReview(outboxId, claimToken, res.errorMessage(), outbox.getRetryCount());
                }
                return;
            }

            JSONObject refundRequest = new JSONObject();
            refundRequest.put("amount", amountPaise);
            refundRequest.put("receipt", receipt);

            JSONObject notes = new JSONObject();
            notes.put("idempotency_key", idempotencyKey);
            notes.put("outbox_id", String.valueOf(outboxId));
            refundRequest.put("notes", notes);

            com.razorpay.Refund createdRefund = razorpayClient.payments.refund(paymentId, refundRequest);
            String refundId = createdRefund != null && createdRefund.has("id") ? createdRefund.get("id").toString() : null;
            String remoteStatus = createdRefund != null && createdRefund.has("status") ? createdRefund.get("status").toString() : "processed";

            if ("failed".equalsIgnoreCase(remoteStatus)) {
                handleFailureOrManualReview(outboxId, claimToken, "Gateway returned refund status failed", outbox.getRetryCount());
            } else {
                finalizeRefundResult(outboxId, claimToken, refundId, RefundStatus.CONFIRMED, null);
            }

        } catch (RazorpayException rzEx) {
            String errorMsg = rzEx.getMessage();
            logger.error("RazorpayException while executing refund for outbox {}: {}", outboxId, errorMsg);

            if (isAlreadyRefundedError(errorMsg)) {
                // Gateway explicitly rejected because already refunded
                finalizeRefundResult(outboxId, claimToken, null, RefundStatus.ALREADY_REFUNDED, null);
            } else if (isTerminalError(errorMsg)) {
                // Non-retryable error (e.g. invalid payment ID, account restricted)
                markTerminalFailure(outboxId, claimToken, errorMsg);
            } else {
                // Network timeout, server error, or uncertain outcome: classify retry vs manual review
                handleFailureOrManualReview(outboxId, claimToken, errorMsg, outbox.getRetryCount());
            }
        } catch (Exception ex) {
            logger.error("Unexpected error executing refund for outbox {}: {}", outboxId, ex.getMessage(), ex);
            handleFailureOrManualReview(outboxId, claimToken, ex.getMessage(), outbox.getRetryCount());
        }
    }

    /**
     * Checks if a refund with matching receipt or idempotency key already exists at Razorpay.
     */
    private com.razorpay.Refund reconcileExistingGatewayRefund(String paymentId, String receipt, String idempotencyKey) {
        try {
            List<com.razorpay.Refund> refunds = razorpayClient.payments.fetchAllRefunds(paymentId);
            if (refunds != null) {
                for (com.razorpay.Refund r : refunds) {
                    String rReceipt = r.has("receipt") ? r.get("receipt").toString() : null;
                    JSONObject notes = r.has("notes") ? r.get("notes") : null;
                    String rKey = (notes != null && notes.has("idempotency_key")) ? notes.getString("idempotency_key") : null;

                    if ((receipt != null && receipt.equals(rReceipt)) ||
                            (idempotencyKey != null && idempotencyKey.equals(rKey))) {
                        return r;
                    }
                }
            }
        } catch (Exception e) {
            logger.warn("Reconciliation fetchAllRefunds failed for payment {}: {}", paymentId, e.getMessage());
        }
        return null;
    }

    /**
     * Checks payment details from Razorpay to verify if total amount_refunded covers the amount.
     */
    private boolean isPaymentAlreadyRefundedAtGateway(String paymentId, Long amountPaise) {
        try {
            com.razorpay.Payment p = razorpayClient.payments.fetch(paymentId);
            if (p != null && p.has("amount_refunded")) {
                long refunded = ((Number) p.get("amount_refunded")).longValue();
                return refunded >= amountPaise;
            }
        } catch (Exception e) {
            logger.warn("Reconciliation fetch payment failed for {}: {}", paymentId, e.getMessage());
        }
        return false;
    }

    /**
     * Finalizes confirmed or already refunded outcome in a short isolated transaction.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void finalizeRefundResult(Long outboxId, String claimToken, String razorpayRefundId, RefundStatus status, String note) {
        RefundOutbox outbox = refundOutboxRepository.findById(outboxId).orElse(null);
        if (outbox == null || (claimToken != null && !claimToken.equals(outbox.getClaimToken()))) {
            return;
        }

        outbox.setStatus(status);
        if (razorpayRefundId != null) {
            outbox.setRazorpayRefundId(razorpayRefundId);
        }
        outbox.setClaimToken(null);
        outbox.setLastAttemptAt(LocalDateTime.now());
        refundOutboxRepository.save(outbox);

        Payment payment = outbox.getPayment();
        if (payment != null) {
            payment.setStatus(Payment.PaymentStatus.REFUNDED);
            if (razorpayRefundId != null) {
                payment.setRefundNote("Refund Confirmed. Razorpay Refund ID: " + razorpayRefundId);
            } else if (note != null) {
                payment.setRefundNote(note);
            }
            paymentRepository.save(payment);

            // User notification
            try {
                if (payment.getUser() != null) {
                    notificationService.sendNotification(
                            payment.getUser(),
                            "Refund Completed",
                            "Your refund of ₹" + (outbox.getAmountPaise() / 100.0) + " has been processed successfully.",
                            "REFUND_CONFIRMED",
                            Map.of("paymentId", payment.getId().toString(), "outboxId", outboxId.toString())
                    );
                }
            } catch (Exception ex) {
                logger.warn("Notification dispatch failed for refund confirmation: {}", ex.getMessage());
            }
        }

        logger.info("Refund outbox {} finalized with status {}", outboxId, status);
    }

    /**
     * Handles pending outcome at the gateway. Reschedules check without marking failure.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handlePendingGatewayOutcome(Long outboxId, String claimToken, String razorpayRefundId) {
        RefundOutbox outbox = refundOutboxRepository.findById(outboxId).orElse(null);
        if (outbox == null || (claimToken != null && !claimToken.equals(outbox.getClaimToken()))) {
            return;
        }
        outbox.setStatus(RefundStatus.PENDING);
        if (razorpayRefundId != null) {
            outbox.setRazorpayRefundId(razorpayRefundId);
        }
        outbox.setClaimToken(null);
        outbox.setLastAttemptAt(LocalDateTime.now());
        outbox.setFailureReason("GATEWAY_PENDING: Razorpay is currently processing the refund.");
        refundOutboxRepository.save(outbox);
    }

    /**
     * Classifies whether a failure should be retried or marked for manual review.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleFailureOrManualReview(Long outboxId, String claimToken, String error, int currentRetryCount) {
        RefundOutbox outbox = refundOutboxRepository.findById(outboxId).orElse(null);
        if (outbox == null || (claimToken != null && !claimToken.equals(outbox.getClaimToken()))) {
            return;
        }

        outbox.setLastAttemptAt(LocalDateTime.now());
        outbox.setClaimToken(null);

        if (currentRetryCount >= maxRetries) {
            logger.error("Outbox {} reached max retries ({}). Escalating to MANUAL_REVIEW to prevent duplicate refunds: {}",
                    outboxId, maxRetries, error);
            outbox.setStatus(RefundStatus.MANUAL_REVIEW);
            outbox.setFailureReason("MANUAL_REVIEW: Max retries exceeded with uncertain gateway outcome: " + sanitizeError(error));
        } else {
            logger.warn("Outbox {} failed attempt {}/{}. Returning to PENDING for retry: {}",
                    outboxId, currentRetryCount, maxRetries, error);
            outbox.setStatus(RefundStatus.PENDING);
            outbox.setFailureReason("RETRYABLE_ERROR: " + sanitizeError(error));
        }

        refundOutboxRepository.save(outbox);
    }

    /**
     * Marks terminal failure when gateway indicates non-retryable error.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markTerminalFailure(Long outboxId, String claimToken, String error) {
        RefundOutbox outbox = refundOutboxRepository.findById(outboxId).orElse(null);
        if (outbox == null || (claimToken != null && !claimToken.equals(outbox.getClaimToken()))) {
            return;
        }

        outbox.setStatus(RefundStatus.FAILED_TERMINAL);
        outbox.setClaimToken(null);
        outbox.setLastAttemptAt(LocalDateTime.now());
        outbox.setFailureReason("TERMINAL_FAILURE: " + sanitizeError(error));
        refundOutboxRepository.save(outbox);
        logger.error("Outbox {} marked FAILED_TERMINAL: {}", outboxId, error);
    }

    /**
     * Canonical transactional helper to safely transition a payment to REFUND_PENDING
     * and persist an idempotent RefundOutbox entry.
     */
    @Transactional
    public RefundOutbox enqueueRefund(Payment payment, String reason) {
        if (payment == null || payment.getRazorpayPaymentId() == null || payment.getRazorpayPaymentId().isBlank()) {
            return null;
        }
        payment.setStatus(Payment.PaymentStatus.REFUND_PENDING);
        if (reason != null) {
            payment.setRefundNote(reason);
        }
        Payment savedPayment = paymentRepository.save(payment);

        String idempotencyKey = "rfnd_op_" + savedPayment.getId() + "_" + savedPayment.getRazorpayPaymentId();
        String receipt = "rcpt_" + savedPayment.getId();
        if (receipt.length() > 40) {
            receipt = receipt.substring(0, 40);
        }

        Optional<RefundOutbox> existing = refundOutboxRepository.findByIdempotencyKey(idempotencyKey);
        if (existing.isPresent()) {
            return existing.get();
        }

        RefundOutbox outbox = RefundOutbox.builder()
                .payment(savedPayment)
                .razorpayPaymentId(savedPayment.getRazorpayPaymentId())
                .amountPaise(savedPayment.getAmount())
                .status(RefundStatus.PENDING)
                .idempotencyKey(idempotencyKey)
                .receipt(receipt)
                .retryCount(0)
                .createdAt(LocalDateTime.now())
                .failureReason(reason)
                .build();

        return refundOutboxRepository.save(outbox);
    }

    private boolean isAlreadyRefundedError(String msg) {
        if (msg == null) return false;
        String lower = msg.toLowerCase();
        return lower.contains("already been refunded") ||
                lower.contains("fully refunded") ||
                lower.contains("amount exceeds allowable refundable amount");
    }

    private boolean isTerminalError(String msg) {
        if (msg == null) return false;
        String lower = msg.toLowerCase();
        return lower.contains("the id provided does not exist") ||
                lower.contains("invalid payment id") ||
                lower.contains("payment has been voided") ||
                lower.contains("account does not have permissions");
    }

    private String sanitizeError(String error) {
        if (error == null) return "Unknown error";
        if (error.length() > 500) {
            return error.substring(0, 500) + "...";
        }
        return error;
    }
}
