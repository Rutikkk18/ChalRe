package com.Startup.chalre.service;

import com.Startup.chalre.DTO.PaymentFinalizationCommand;
import com.Startup.chalre.DTO.PaymentFinalizationResult;
import com.Startup.chalre.entity.*;
import com.Startup.chalre.repository.*;
import com.razorpay.RazorpayClient;
import com.razorpay.Utils;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class PaymentFinalizationService {

    private static final Logger logger = LoggerFactory.getLogger(PaymentFinalizationService.class);

    private final RideRepository rideRepository;
    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final SeatHoldRepository seatHoldRepository;
    private final RefundOutboxRepository refundOutboxRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final String razorpaySecret;
    private final RazorpayClient razorpayClient;
    private final TransactionTemplate transactionTemplate;

    @Autowired
    public PaymentFinalizationService(
            RideRepository rideRepository,
            BookingRepository bookingRepository,
            PaymentRepository paymentRepository,
            SeatHoldRepository seatHoldRepository,
            RefundOutboxRepository refundOutboxRepository,
            UserRepository userRepository,
            NotificationService notificationService,
            @Qualifier("razorpaySecret") String razorpaySecret,
            RazorpayClient razorpayClient,
            PlatformTransactionManager transactionManager) {
        this.rideRepository = rideRepository;
        this.bookingRepository = bookingRepository;
        this.paymentRepository = paymentRepository;
        this.seatHoldRepository = seatHoldRepository;
        this.refundOutboxRepository = refundOutboxRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.razorpaySecret = razorpaySecret;
        this.razorpayClient = razorpayClient;
        this.transactionTemplate = transactionManager != null ? new TransactionTemplate(transactionManager) : null;
    }

    public PaymentFinalizationService(
            RideRepository rideRepository,
            BookingRepository bookingRepository,
            PaymentRepository paymentRepository,
            SeatHoldRepository seatHoldRepository,
            RefundOutboxRepository refundOutboxRepository,
            UserRepository userRepository,
            NotificationService notificationService,
            @Qualifier("razorpaySecret") String razorpaySecret,
            RazorpayClient razorpayClient,
            TransactionTemplate transactionTemplate) {
        this.rideRepository = rideRepository;
        this.bookingRepository = bookingRepository;
        this.paymentRepository = paymentRepository;
        this.seatHoldRepository = seatHoldRepository;
        this.refundOutboxRepository = refundOutboxRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.razorpaySecret = razorpaySecret;
        this.razorpayClient = razorpayClient;
        this.transactionTemplate = transactionTemplate;
    }

    public PaymentFinalizationService(
            RideRepository rideRepository,
            BookingRepository bookingRepository,
            PaymentRepository paymentRepository,
            SeatHoldRepository seatHoldRepository,
            RefundOutboxRepository refundOutboxRepository,
            UserRepository userRepository,
            NotificationService notificationService,
            @Qualifier("razorpaySecret") String razorpaySecret,
            RazorpayClient razorpayClient) {
        this(rideRepository, bookingRepository, paymentRepository, seatHoldRepository,
             refundOutboxRepository, userRepository, notificationService, razorpaySecret,
             razorpayClient, (PlatformTransactionManager) null);
    }

    /**
     * Entry point for payment finalization.
     * Executes non-blocking pre-checks and signature validation outside any database locks,
     * then executes atomic state finalization under ride row lock.
     */
    public PaymentFinalizationResult finalizePaymentAndBooking(PaymentFinalizationCommand cmd, User authenticatedUser) {
        if (cmd.getRazorpayPaymentId() == null || cmd.getRazorpayPaymentId().isBlank()) {
            throw new IllegalArgumentException("Razorpay Payment ID is required");
        }
        if (cmd.getRazorpayOrderId() == null || cmd.getRazorpayOrderId().isBlank()) {
            throw new IllegalArgumentException("Razorpay Order ID is required");
        }
        if (cmd.getRideId() == null) {
            throw new IllegalArgumentException("Ride ID is required");
        }
        if (cmd.getSeats() == null || cmd.getSeats() < 1) {
            throw new IllegalArgumentException("Seats must be at least 1");
        }

        // 1. Authenticity check: Verify signature if not pre-verified by webhook HMAC
        if (!cmd.isSignaturePreVerified()) {
            if (cmd.getRazorpaySignature() == null || cmd.getRazorpaySignature().isBlank()) {
                throw new IllegalArgumentException("Payment signature is required");
            }
            boolean valid = verifySignature(cmd.getRazorpayOrderId(), cmd.getRazorpayPaymentId(), cmd.getRazorpaySignature());
            if (!valid) {
                logger.error("Signature verification failed for order: {}, payment: {}",
                        cmd.getRazorpayOrderId(), cmd.getRazorpayPaymentId());
                throw new IllegalArgumentException("Payment signature verification failed");
            }
        }

        // 2. Idempotency Pre-Check (Non-locking fast path)
        Optional<Payment> existingPaymentOpt = paymentRepository.findByRazorpayPaymentId(cmd.getRazorpayPaymentId());
        if (existingPaymentOpt.isPresent()) {
            Payment existingPayment = existingPaymentOpt.get();
            if (Payment.PaymentStatus.SUCCESS.equals(existingPayment.getStatus())) {
                Optional<Booking> existingBooking = bookingRepository.findByTxnId(cmd.getRazorpayPaymentId());
                Long bookingId = existingBooking.map(Booking::getId).orElse(null);
                logger.info("Payment {} already successfully finalized (BookingId: {}). Returning idempotent result.",
                        cmd.getRazorpayPaymentId(), bookingId);

                return PaymentFinalizationResult.builder()
                        .success(true)
                        .alreadyProcessed(true)
                        .paymentId(existingPayment.getId())
                        .bookingId(bookingId)
                        .status("SUCCESS")
                        .message("Payment already verified. Booking confirmed!")
                        .build();
            } else if (Payment.PaymentStatus.REFUND_PENDING.equals(existingPayment.getStatus())
                    || Payment.PaymentStatus.REFUNDED.equals(existingPayment.getStatus())) {
                logger.info("Payment {} was previously queued for refund. Returning idempotent refund status.",
                        cmd.getRazorpayPaymentId());

                return PaymentFinalizationResult.builder()
                        .success(false)
                        .alreadyProcessed(true)
                        .paymentId(existingPayment.getId())
                        .status(existingPayment.getStatus().name())
                        .refundInitiated(true)
                        .message("Payment was previously marked for refund due to seat unavailability.")
                        .build();
            }
        }

        // 3. Execute atomic finalization under database row locks
        if (transactionTemplate != null) {
            return transactionTemplate.execute(status -> executeAtomicFinalization(cmd, authenticatedUser));
        } else {
            return executeAtomicFinalization(cmd, authenticatedUser);
        }
    }

    /**
     * Atomically executes the booking confirmation or durable refund decision.
     * Locks the Ride row to eliminate concurrent overselling races.
     */
    @Transactional
    public PaymentFinalizationResult executeAtomicFinalization(PaymentFinalizationCommand cmd, User authenticatedUser) {
        LocalDateTime now = LocalDateTime.now();

        // ── STEP 1: Lock Ride ──
        Ride ride = rideRepository.findByIdForUpdate(cmd.getRideId())
                .orElseThrow(() -> new RuntimeException("Ride not found: " + cmd.getRideId()));

        // Double check payment existence under ride lock in case of concurrent thread race
        Optional<Payment> racePayment = paymentRepository.findByRazorpayPaymentId(cmd.getRazorpayPaymentId());
        if (racePayment.isPresent()) {
            Payment p = racePayment.get();
            Optional<Booking> b = bookingRepository.findByTxnId(cmd.getRazorpayPaymentId());
            return PaymentFinalizationResult.builder()
                    .success(Payment.PaymentStatus.SUCCESS.equals(p.getStatus()))
                    .alreadyProcessed(true)
                    .paymentId(p.getId())
                    .bookingId(b.map(Booking::getId).orElse(null))
                    .status(p.getStatus().name())
                    .message("Payment already finalized concurrently.")
                    .build();
        }

        // ── STEP 2: Lock and Inspect SeatHold ──
        Optional<SeatHold> holdOpt = seatHoldRepository.findByRazorpayOrderId(cmd.getRazorpayOrderId());
        SeatHold hold = null;
        boolean hasCapacity = false;

        if (holdOpt.isPresent()) {
            hold = seatHoldRepository.findByIdForUpdate(holdOpt.get().getId()).orElse(null);
            if (hold != null) {
                // Validate passenger ownership if user context is provided
                if (authenticatedUser != null && !hold.getUser().getId().equals(authenticatedUser.getId())) {
                    throw new SecurityException("This checkout hold does not belong to the authenticated user");
                }

                // If hold was already completed, return existing
                if (SeatHoldStatus.COMPLETED.equals(hold.getStatus())) {
                    Optional<Booking> b = bookingRepository.findByTxnId(cmd.getRazorpayPaymentId());
                    return PaymentFinalizationResult.builder()
                            .success(true)
                            .alreadyProcessed(true)
                            .bookingId(b.map(Booking::getId).orElse(null))
                            .status("SUCCESS")
                            .message("Hold already completed.")
                            .build();
                }

                // Evaluate capacity
                if (SeatHoldStatus.HELD.equals(hold.getStatus()) || SeatHoldStatus.PENDING_ORDER.equals(hold.getStatus()) || SeatHoldStatus.EXPIRED_UNRECONCILED.equals(hold.getStatus())) {
                    if (hold.getExpiresAt().isAfter(now)) {
                        // Hold is ACTIVE! Seats are reserved by this hold.
                        hasCapacity = true;
                    } else {
                        // Hold has EXPIRED. Check if seats can be safely salvaged!
                        int otherActiveHolds = seatHoldRepository.sumActiveHeldSeats(
                                ride.getId(),
                                List.of(SeatHoldStatus.PENDING_ORDER, SeatHoldStatus.HELD, SeatHoldStatus.EXPIRED_UNRECONCILED),
                                now,
                                hold.getId()
                        );
                        int unreservedCapacity = ride.getAvailableSeats() - otherActiveHolds;
                        hasCapacity = unreservedCapacity >= cmd.getSeats();
                        logger.info("Expired hold salvage evaluation for ride {}: unreserved={}, requested={}, result={}",
                                ride.getId(), unreservedCapacity, cmd.getSeats(), hasCapacity);
                    }
                } else {
                    // Hold is RELEASED, EXPIRED, or FAILED. Evaluate if capacity remains:
                    int otherActiveHolds = seatHoldRepository.sumActiveHeldSeats(
                            ride.getId(),
                            List.of(SeatHoldStatus.PENDING_ORDER, SeatHoldStatus.HELD, SeatHoldStatus.EXPIRED_UNRECONCILED),
                            now,
                            null
                    );
                    int unreservedCapacity = ride.getAvailableSeats() - otherActiveHolds;
                    hasCapacity = unreservedCapacity >= cmd.getSeats();
                }
            }
        } else {
            // No hold found: Evaluate capacity directly
            int otherActiveHolds = seatHoldRepository.sumActiveHeldSeats(
                    ride.getId(),
                    List.of(SeatHoldStatus.PENDING_ORDER, SeatHoldStatus.HELD, SeatHoldStatus.EXPIRED_UNRECONCILED),
                    now,
                    null
            );
            int unreservedCapacity = ride.getAvailableSeats() - otherActiveHolds;
            hasCapacity = unreservedCapacity >= cmd.getSeats();
        }

        if (!"ACTIVE".equalsIgnoreCase(ride.getStatus())) {
            logger.warn("Ride {} is not ACTIVE (status: {}). Denying capacity.", ride.getId(), ride.getStatus());
            hasCapacity = false;
        }

        User bookingUser = authenticatedUser != null ? authenticatedUser : (hold != null ? hold.getUser() : null);
        if (bookingUser == null && cmd.getUserId() != null) {
            bookingUser = userRepository.findById(cmd.getUserId()).orElse(null);
        }
        if (bookingUser == null) {
            throw new IllegalStateException("Cannot resolve passenger for booking confirmation");
        }

        // ── STEP 3A: SUCCESS PATH — Capacity confirmed, book seat ──
        if (hasCapacity) {
            if (hold != null) {
                hold.setStatus(SeatHoldStatus.COMPLETED);
                hold.setLastReconciledAt(now);
                seatHoldRepository.save(hold);
            }

            // Decrement available seats
            ride.setAvailableSeats(ride.getAvailableSeats() - cmd.getSeats());
            rideRepository.save(ride);

            // Persist Payment as SUCCESS
            Payment payment = new Payment();
            payment.setUser(bookingUser);
            payment.setRide(ride);
            payment.setAmount(cmd.getAmountPaise());
            payment.setStatus(Payment.PaymentStatus.SUCCESS);
            payment.setPaymentMethod("ONLINE");
            payment.setRazorpayOrderId(cmd.getRazorpayOrderId());
            payment.setRazorpayPaymentId(cmd.getRazorpayPaymentId());
            payment.setRazorpaySignature(cmd.getRazorpaySignature());
            payment.setCreatedAt(now);
            Payment savedPayment = paymentRepository.save(payment);

            // Persist Booking as BOOKED
            Booking booking = new Booking();
            booking.setUser(bookingUser);
            booking.setRide(ride);
            booking.setSeatsBooked(cmd.getSeats());
            booking.setStatus("BOOKED");
            booking.setBookingTime(now.toString());
            booking.setPaymentMethod("ONLINE");
            booking.setPaymentStatus("PAID");
            booking.setTxnId(cmd.getRazorpayPaymentId());
            booking.setPassengerPickup(cmd.getPassengerPickup() != null ? cmd.getPassengerPickup() : ride.getStartLocation());
            booking.setPassengerDrop(cmd.getPassengerDrop() != null ? cmd.getPassengerDrop() : ride.getEndLocation());
            booking.setPickupLat(cmd.getPickupLat());
            booking.setPickupLng(cmd.getPickupLng());
            booking.setDropLat(cmd.getDropLat());
            booking.setDropLng(cmd.getDropLng());
            double perSeatPrice = cmd.getBookedPrice() != null ? cmd.getBookedPrice() : (cmd.getAmountPaise() / (100.0 * cmd.getSeats()));
            booking.setBookedPrice(perSeatPrice);
            Booking savedBooking = bookingRepository.save(booking);

            logger.info("Booking confirmed successfully: BookingId: {}, PaymentId: {}, RideId: {}, Seats: {}",
                    savedBooking.getId(), savedPayment.getId(), ride.getId(), cmd.getSeats());

            // Notifications
            try {
                notificationService.sendNotification(
                        bookingUser,
                        "Booking Confirmed",
                        "Your booking for ride from " + ride.getStartLocation() + " to " + ride.getEndLocation() + " is confirmed.",
                        "BOOKING_CONFIRMED",
                        Map.of("bookingId", savedBooking.getId().toString(), "rideId", ride.getId().toString())
                );
                notificationService.sendNotification(
                        ride.getDriver(),
                        "New Booking Received",
                        (bookingUser.getName() != null ? bookingUser.getName() : "A passenger") +
                                " booked " + cmd.getSeats() + " seat(s) on your ride from " +
                                ride.getStartLocation() + " to " + ride.getEndLocation() + ".",
                        "NEW_BOOKING",
                        Map.of("bookingId", savedBooking.getId().toString(), "rideId", ride.getId().toString())
                );
            } catch (Exception notifEx) {
                logger.warn("Notification dispatch failed (non-blocking): {}", notifEx.getMessage());
            }

            return PaymentFinalizationResult.builder()
                    .success(true)
                    .paymentId(savedPayment.getId())
                    .bookingId(savedBooking.getId())
                    .status("SUCCESS")
                    .message("Payment verified. Booking confirmed!")
                    .build();
        }

        // ── STEP 3B: CAPACITY LOSS / REFUND FALLBACK PATH ──
        logger.warn("Capacity lost for ride {} during finalization of payment {}. Initiating durable refund decision.",
                ride.getId(), cmd.getRazorpayPaymentId());

        if (hold != null) {
            hold.setStatus(SeatHoldStatus.EXPIRED);
            hold.setLastReconciledAt(now);
            seatHoldRepository.save(hold);
        }

        // Persist Payment as REFUND_PENDING
        Payment payment = new Payment();
        payment.setUser(bookingUser);
        payment.setRide(ride);
        payment.setAmount(cmd.getAmountPaise());
        payment.setStatus(Payment.PaymentStatus.REFUND_PENDING);
        payment.setPaymentMethod("ONLINE");
        payment.setRazorpayOrderId(cmd.getRazorpayOrderId());
        payment.setRazorpayPaymentId(cmd.getRazorpayPaymentId());
        payment.setRazorpaySignature(cmd.getRazorpaySignature());
        payment.setCreatedAt(now);
        payment.setRefundNote(!"ACTIVE".equalsIgnoreCase(ride.getStatus()) ? "AUTO_REFUND: Ride was cancelled or deactivated." : "AUTO_REFUND: Seat hold expired and seats were booked by another passenger.");
        Payment savedPayment = paymentRepository.save(payment);

        // Persist durable RefundOutbox record
        String idempotencyKey = "rfnd_op_" + savedPayment.getId() + "_" + cmd.getRazorpayPaymentId();
        String receipt = "rcpt_" + savedPayment.getId();
        if (receipt.length() > 40) {
            receipt = receipt.substring(0, 40);
        }

        Optional<RefundOutbox> existingOutbox = refundOutboxRepository.findByIdempotencyKey(idempotencyKey);
        RefundOutbox outbox;
        if (existingOutbox.isPresent()) {
            outbox = existingOutbox.get();
        } else {
            outbox = RefundOutbox.builder()
                    .payment(savedPayment)
                    .razorpayPaymentId(cmd.getRazorpayPaymentId())
                    .amountPaise(cmd.getAmountPaise())
                    .status(RefundStatus.PENDING)
                    .idempotencyKey(idempotencyKey)
                    .receipt(receipt)
                    .retryCount(0)
                    .createdAt(now)
                    .failureReason(!"ACTIVE".equalsIgnoreCase(ride.getStatus()) ? "RIDE_CANCELLED_BEFORE_FINALIZATION" : "CAPACITY_LOST_EXPIRED_HOLD")
                    .build();
            outbox = refundOutboxRepository.save(outbox);
        }

        logger.info("Durable refund outbox record created: OutboxId: {}, PaymentId: {}, Amount: {} paise",
                outbox.getId(), savedPayment.getId(), cmd.getAmountPaise());

        try {
            notificationService.sendNotification(
                    bookingUser,
                    "Booking Unavailable — Refund Initiated",
                    "Your payment of ₹" + (cmd.getAmountPaise() / 100.0) +
                            " was received, but the seat was no longer available. A full refund has been automatically initiated.",
                    "REFUND_INITIATED",
                    Map.of("paymentId", savedPayment.getId().toString(), "rideId", ride.getId().toString())
            );
        } catch (Exception notifEx) {
            logger.warn("Notification dispatch failed (non-blocking): {}", notifEx.getMessage());
        }

        return PaymentFinalizationResult.builder()
                .success(false)
                .paymentId(savedPayment.getId())
                .status("REFUND_PENDING")
                .refundInitiated(true)
                .refundOutboxId(outbox.getId())
                .message("Seat is no longer available. A full refund of ₹" +
                        (cmd.getAmountPaise() / 100.0) + " has been safely queued.")
                .build();
    }

    private boolean verifySignature(String razorpayOrderId, String razorpayPaymentId, String razorpaySignature) {
        try {
            JSONObject options = new JSONObject();
            options.put("razorpay_order_id", razorpayOrderId);
            options.put("razorpay_payment_id", razorpayPaymentId);
            options.put("razorpay_signature", razorpaySignature);
            return Utils.verifyPaymentSignature(options, razorpaySecret);
        } catch (Exception e) {
            logger.error("Error verifying payment signature: {}", e.getMessage());
            return false;
        }
    }
}
