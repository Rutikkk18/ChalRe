package com.Startup.chalre.service;

import com.Startup.chalre.DTO.PaymentFinalizationCommand;
import com.Startup.chalre.DTO.PaymentFinalizationResult;
import com.Startup.chalre.entity.SeatHold;
import com.Startup.chalre.entity.SeatHoldStatus;
import com.Startup.chalre.repository.SeatHoldRepository;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
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

@Service
public class SeatHoldSweeperService {

    private static final Logger logger = LoggerFactory.getLogger(SeatHoldSweeperService.class);

    private final SeatHoldRepository seatHoldRepository;
    private final PaymentFinalizationService paymentFinalizationService;
    private final RazorpayClient razorpayClient;

    @Value("${chalre.hold.sweeper.batch-size:10}")
    private int batchSize = 10;

    @Value("${chalre.hold.sweeper.retry-backoff-seconds:60}")
    private int retryBackoffSeconds = 60;

    public SeatHoldSweeperService(
            SeatHoldRepository seatHoldRepository,
            PaymentFinalizationService paymentFinalizationService,
            RazorpayClient razorpayClient) {
        this.seatHoldRepository = seatHoldRepository;
        this.paymentFinalizationService = paymentFinalizationService;
        this.razorpayClient = razorpayClient;
    }

    /**
     * Periodic scheduled runner to reconcile and recover expired seat holds.
     * Guarantees capacity is never released on uncertain gateway state.
     */
    @Scheduled(fixedDelayString = "${chalre.hold.sweeper.delay-ms:15000}", initialDelay = 10000)
    public int sweepExpiredHolds() {
        try {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime retryThreshold = now.minusSeconds(retryBackoffSeconds);

            List<SeatHold> expiredCandidates = seatHoldRepository.findExpiredHoldsForSweeper(
                    List.of(SeatHoldStatus.PENDING_ORDER, SeatHoldStatus.HELD, SeatHoldStatus.EXPIRED_UNRECONCILED),
                    now,
                    retryThreshold,
                    PageRequest.of(0, batchSize)
            );

            if (expiredCandidates.isEmpty()) {
                return 0;
            }

            int processedCount = 0;
            for (SeatHold candidate : expiredCandidates) {
                processExpiredCandidate(candidate.getId());
                processedCount++;
            }

            return processedCount;
        } catch (Exception e) {
            logger.error("Error during expired hold sweeper cycle: {}", e.getMessage(), e);
            return 0;
        }
    }

    /**
     * Processes an individual expired hold candidate.
     * External gateway calls execute strictly OUTSIDE database transactions.
     */
    public void processExpiredCandidate(Long holdId) {
        SeatHold hold = seatHoldRepository.findById(holdId).orElse(null);
        if (hold == null || SeatHoldStatus.COMPLETED.equals(hold.getStatus())) {
            return;
        }

        String orderId = hold.getRazorpayOrderId();

        // ── CASE 1: PENDING_ORDER without Razorpay Order attached ──
        if (orderId == null || orderId.isBlank()) {
            if (SeatHoldStatus.PENDING_ORDER.equals(hold.getStatus())) {
                logger.info("Sweeper: Hold {} abandoned in PENDING_ORDER without Razorpay order. Marking EXPIRED.", holdId);
                markHoldExpired(holdId);
            }
            return;
        }

        // ── CASE 2: HELD or EXPIRED_UNRECONCILED with Razorpay Order ID ──
        try {
            Order rzpOrder = razorpayClient.orders.fetch(orderId);
            String orderStatus = rzpOrder.has("status") ? rzpOrder.get("status").toString() : "";
            long amountPaid = rzpOrder.has("amount_paid") ? ((Number) rzpOrder.get("amount_paid")).longValue() : 0L;

            if ("paid".equalsIgnoreCase(orderStatus) || amountPaid > 0) {
                // LATE PAYMENT DETECTED!
                logger.warn("Sweeper: Expired hold {} has paid order {}. Reconciling late payment.", holdId, orderId);
                reconcileLatePayment(hold, orderId);
                return;
            }

            // If order was attempted or created, inspect payments
            List<com.razorpay.Payment> payments = null;
            try {
                payments = razorpayClient.orders.fetchPayments(orderId);
            } catch (Exception pEx) {
                logger.warn("Sweeper: Failed to fetch payments for order {}: {}", orderId, pEx.getMessage());
            }

            if (payments != null && !payments.isEmpty()) {
                com.razorpay.Payment capturedPayment = null;
                boolean inFlight = false;

                for (com.razorpay.Payment p : payments) {
                    String pStatus = p.has("status") ? p.get("status").toString() : "";
                    if ("captured".equalsIgnoreCase(pStatus)) {
                        capturedPayment = p;
                        break;
                    } else if ("authorized".equalsIgnoreCase(pStatus) || "created".equalsIgnoreCase(pStatus)) {
                        inFlight = true;
                    }
                }

                if (capturedPayment != null) {
                    logger.warn("Sweeper: Found captured payment {} for expired hold order {}. Finalizing.",
                            capturedPayment.get("id"), orderId);
                    finalizeCapturedLatePayment(hold, capturedPayment.get("id").toString(),
                            ((Number) capturedPayment.get("amount")).longValue());
                    return;
                }

                if (inFlight) {
                    logger.info("Sweeper: Payment is currently in flight for order {}. Deferring expiry.", orderId);
                    markHoldUnreconciled(holdId, "IN_FLIGHT_PAYMENT: Payment authorization pending at gateway.");
                    return;
                }
            }

            // All payments failed or no payment attempted: safe to expire hold and release capacity
            logger.info("Sweeper: Order {} confirmed unpaid/failed at Razorpay. Releasing hold {}.", orderId, holdId);
            markHoldExpired(holdId);

        } catch (Exception ex) {
            logger.error("Sweeper: Gateway reconciliation failed for order {} on hold {}: {}. Protecting capacity as EXPIRED_UNRECONCILED.",
                    orderId, holdId, ex.getMessage());
            markHoldUnreconciled(holdId, "GATEWAY_UNREACHABLE: " + ex.getMessage());
        }
    }

    private void reconcileLatePayment(SeatHold hold, String orderId) {
        try {
            List<com.razorpay.Payment> payments = razorpayClient.orders.fetchPayments(orderId);
            if (payments != null) {
                for (com.razorpay.Payment p : payments) {
                    String pStatus = p.has("status") ? p.get("status").toString() : "";
                    if ("captured".equalsIgnoreCase(pStatus)) {
                        finalizeCapturedLatePayment(hold, p.get("id").toString(), ((Number) p.get("amount")).longValue());
                        return;
                    }
                }
            }
            markHoldUnreconciled(hold.getId(), "PAID_ORDER_WITHOUT_CAPTURED_PAYMENT");
        } catch (Exception ex) {
            logger.error("Sweeper: Error fetching payments for paid order {}: {}", orderId, ex.getMessage());
            markHoldUnreconciled(hold.getId(), "ERROR_FETCHING_PAYMENTS: " + ex.getMessage());
        }
    }

    private void finalizeCapturedLatePayment(SeatHold hold, String paymentId, long amountPaise) {
        PaymentFinalizationCommand cmd = PaymentFinalizationCommand.builder()
                .razorpayPaymentId(paymentId)
                .razorpayOrderId(hold.getRazorpayOrderId())
                .amountPaise(amountPaise)
                .rideId(hold.getRide().getId())
                .seats(hold.getSeatsHeld())
                .userId(hold.getUser().getId())
                .signaturePreVerified(true)
                .build();

        PaymentFinalizationResult result = paymentFinalizationService.finalizePaymentAndBooking(cmd, null);
        logger.info("Sweeper finalized late payment {}: success={}, status={}, refundInitiated={}",
                paymentId, result.isSuccess(), result.getStatus(), result.isRefundInitiated());
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markHoldExpired(Long holdId) {
        SeatHold hold = seatHoldRepository.findById(holdId).orElse(null);
        if (hold == null || SeatHoldStatus.COMPLETED.equals(hold.getStatus())) {
            return;
        }

        hold.setStatus(SeatHoldStatus.EXPIRED);
        hold.setLastReconciledAt(LocalDateTime.now());
        seatHoldRepository.save(hold);
        logger.info("Sweeper: Hold {} marked EXPIRED. Capacity released.", holdId);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markHoldUnreconciled(Long holdId, String reason) {
        SeatHold hold = seatHoldRepository.findById(holdId).orElse(null);
        if (hold == null || SeatHoldStatus.COMPLETED.equals(hold.getStatus())) {
            return;
        }

        hold.setStatus(SeatHoldStatus.EXPIRED_UNRECONCILED);
        hold.setLastReconciledAt(LocalDateTime.now());
        seatHoldRepository.save(hold);
        logger.warn("Sweeper: Hold {} marked EXPIRED_UNRECONCILED: {}", holdId, reason);
    }
}
