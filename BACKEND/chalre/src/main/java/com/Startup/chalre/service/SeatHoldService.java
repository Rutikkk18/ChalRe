package com.Startup.chalre.service;

import com.Startup.chalre.Exception.SeatUnavailableException;
import com.Startup.chalre.entity.Ride;
import com.Startup.chalre.entity.SeatHold;
import com.Startup.chalre.entity.SeatHoldStatus;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.repository.RideRepository;
import com.Startup.chalre.repository.SeatHoldRepository;
import com.Startup.chalre.repository.UserRepository;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Consumer;

@Service
public class SeatHoldService {

    private static final Logger logger = LoggerFactory.getLogger(SeatHoldService.class);

    public static final int PENDING_HOLD_TTL_SECONDS = 90;
    public static final int ACTIVE_CHECKOUT_TTL_MINUTES = 5;

    private final RideRepository rideRepository;
    private final UserRepository userRepository;
    private final SeatHoldRepository seatHoldRepository;
    private final RazorpayClient razorpayClient;
    private final RideService rideService;
    private final TransactionTemplate transactionTemplate;

    @Autowired
    public SeatHoldService(
            RideRepository rideRepository,
            UserRepository userRepository,
            SeatHoldRepository seatHoldRepository,
            RazorpayClient razorpayClient,
            RideService rideService,
            PlatformTransactionManager transactionManager) {
        this.rideRepository = rideRepository;
        this.userRepository = userRepository;
        this.seatHoldRepository = seatHoldRepository;
        this.razorpayClient = razorpayClient;
        this.rideService = rideService;
        this.transactionTemplate = transactionManager != null ? new TransactionTemplate(transactionManager) : null;
    }

    public SeatHoldService(
            RideRepository rideRepository,
            UserRepository userRepository,
            SeatHoldRepository seatHoldRepository,
            RazorpayClient razorpayClient,
            RideService rideService,
            TransactionTemplate transactionTemplate) {
        this.rideRepository = rideRepository;
        this.userRepository = userRepository;
        this.seatHoldRepository = seatHoldRepository;
        this.razorpayClient = razorpayClient;
        this.rideService = rideService;
        this.transactionTemplate = transactionTemplate;
    }

    // Backwards-compatible constructor for existing tests
    public SeatHoldService(
            RideRepository rideRepository,
            UserRepository userRepository,
            SeatHoldRepository seatHoldRepository,
            RazorpayClient razorpayClient,
            RideService rideService) {
        this(rideRepository, userRepository, seatHoldRepository, razorpayClient, rideService, (TransactionTemplate) null);
    }

    private <T> T executeInTransaction(TransactionCallback<T> action) {
        if (transactionTemplate != null) {
            return transactionTemplate.execute(action);
        }
        return action.doInTransaction(null);
    }

    private void executeWithoutResult(Consumer<org.springframework.transaction.TransactionStatus> action) {
        if (transactionTemplate != null) {
            transactionTemplate.executeWithoutResult(action::accept);
        } else {
            action.accept(null);
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReservationResult {
        private Long holdId;
        private String holdReference;
        private String receipt;
        private Long rideId;
        private Integer seats;
        private Long userId;
        private Long verifiedAmountPaise;
    }

    /**
     * Transaction A: Validate request, calculate authoritative capacity under lock,
     * and persist initial SeatHold in PENDING_ORDER state (90-second TTL).
     * Commits immediately so database row locks are NOT held during external gateway calls.
     */
    @Transactional
    public ReservationResult reserveHold(Long rideId, Integer seats, Long userId, Long amountPaise,
                                        Double pickupLat, Double pickupLng, Double dropLat, Double dropLng) {
        if (rideId == null) {
            throw new IllegalArgumentException("Ride ID is required");
        }
        if (seats == null || seats < 1) {
            throw new IllegalArgumentException("Invalid seats count: " + seats);
        }

        Ride ride = rideRepository.findByIdForUpdate(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found: " + rideId));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        if (ride.getDriver().getId().equals(userId)) {
            throw new IllegalArgumentException("You cannot book your own ride.");
        }

        // Validate ride date
        try {
            LocalDate rideDate = LocalDate.parse(ride.getDate());
            if (rideDate.isBefore(LocalDate.now(java.time.ZoneId.of("Asia/Kolkata")))) {
                throw new IllegalArgumentException("Cannot book a ride that has already passed");
            }
        } catch (Exception e) {
            if (e instanceof IllegalArgumentException) throw e;
        }

        // Authoritative capacity check honoring active SeatHolds
        int activeHeld = seatHoldRepository.sumActiveHeldSeats(
                rideId,
                List.of(SeatHoldStatus.PENDING_ORDER, SeatHoldStatus.HELD, SeatHoldStatus.EXPIRED_UNRECONCILED),
                LocalDateTime.now(),
                null // Exempt hold ID is null during creation
        );

        int unreservedCapacity = ride.getAvailableSeats() - activeHeld;
        if (unreservedCapacity < seats) {
            logger.info("Hold rejected for ride {}: requested={}, available={}, activeHeld={}, unreserved={}",
                    rideId, seats, ride.getAvailableSeats(), activeHeld, unreservedCapacity);
            throw new SeatUnavailableException("This seat is currently held by another passenger. Please try again in 5 minutes.");
        }

        // Validate server-calculated price (RideService.calculatePrice uses findById without lock)
        Map<String, Object> priceData = rideService.calculatePrice(
                rideId, pickupLat, pickupLng, dropLat, dropLng);
        double serverPerSeatPrice = ((Number) priceData.get("calculatedPrice")).doubleValue();
        long expectedPaise = Math.round(serverPerSeatPrice * seats * 100);

        if (Math.abs(amountPaise - expectedPaise) > 100) {
            logger.warn("Amount mismatch for ride {}: client={} paise, server={} paise",
                    rideId, amountPaise, expectedPaise);
            throw new IllegalArgumentException("Payment amount does not match the expected price.");
        }

        String holdReference = "hld_" + UUID.randomUUID().toString().replace("-", "");
        LocalDateTime now = LocalDateTime.now();

        SeatHold seatHold = SeatHold.builder()
                .ride(ride)
                .user(user)
                .seatsHeld(seats)
                .holdReference(holdReference)
                .status(SeatHoldStatus.PENDING_ORDER)
                .createdAt(now)
                .expiresAt(now.plusSeconds(PENDING_HOLD_TTL_SECONDS))
                .build();

        SeatHold savedHold = seatHoldRepository.save(seatHold);

        // Generate receipt string for Razorpay (max 40 chars)
        // Format: rcpt_<holdId>_<random12>
        String receipt = "rcpt_" + savedHold.getId() + "_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        if (receipt.length() > 40) {
            receipt = receipt.substring(0, 40);
        }

        logger.info("SeatHold reserved (TX-A committed) - HoldId: {}, RideId: {}, Seats: {}, TTL: {}s",
                savedHold.getId(), rideId, seats, PENDING_HOLD_TTL_SECONDS);

        return ReservationResult.builder()
                .holdId(savedHold.getId())
                .holdReference(holdReference)
                .receipt(receipt)
                .rideId(rideId)
                .seats(seats)
                .userId(userId)
                .verifiedAmountPaise(expectedPaise)
                .build();
    }

    /**
     * Transaction B: Attach the successfully created Razorpay order to the hold
     * and transition hold status from PENDING_ORDER to HELD with full 5-minute checkout TTL.
     */
    @Transactional
    public SeatHold attachOrder(Long holdId, String razorpayOrderId) {
        SeatHold hold = seatHoldRepository.findByIdForUpdate(holdId)
                .orElseThrow(() -> new IllegalStateException("SeatHold not found: " + holdId));

        if (!SeatHoldStatus.PENDING_ORDER.equals(hold.getStatus())) {
            throw new IllegalStateException("Hold " + holdId + " is not in PENDING_ORDER state. Current: " + hold.getStatus());
        }

        if (hold.getExpiresAt().isBefore(LocalDateTime.now())) {
            hold.setStatus(SeatHoldStatus.EXPIRED_UNRECONCILED);
            seatHoldRepository.save(hold);
            throw new IllegalStateException("Hold " + holdId + " expired before order attachment.");
        }

        LocalDateTime now = LocalDateTime.now();
        hold.setRazorpayOrderId(razorpayOrderId);
        hold.setStatus(SeatHoldStatus.HELD);
        hold.setExpiresAt(now.plusMinutes(ACTIVE_CHECKOUT_TTL_MINUTES));
        hold.setLastReconciledAt(now);

        SeatHold updated = seatHoldRepository.save(hold);
        logger.info("SeatHold order attached (TX-B committed) - HoldId: {}, OrderId: {}, ExpiresAt: {}",
                holdId, razorpayOrderId, updated.getExpiresAt());
        return updated;
    }

    /**
     * Explicitly releases a seat hold when the passenger cancels checkout before payment.
     * Only transitions from HELD or PENDING_ORDER to RELEASED.
     */
    @Transactional
    public boolean releaseHold(Long holdId, String razorpayOrderId, Long userId) {
        return executeInTransaction(status -> {
            Optional<SeatHold> holdOpt = Optional.empty();
            if (holdId != null) {
                holdOpt = seatHoldRepository.findByIdForUpdate(holdId);
            } else if (razorpayOrderId != null && !razorpayOrderId.isBlank()) {
                holdOpt = seatHoldRepository.findByRazorpayOrderId(razorpayOrderId);
            }

            if (holdOpt.isEmpty()) {
                return false;
            }

            SeatHold hold = holdOpt.get();

            // Enforce user authorization
            if (hold.getUser() != null && !hold.getUser().getId().equals(userId)) {
                throw new SecurityException("Unauthorized to release hold " + hold.getId());
            }

            // Only release if the hold is still in an uncompleted/active state
            if (SeatHoldStatus.HELD.equals(hold.getStatus()) || SeatHoldStatus.PENDING_ORDER.equals(hold.getStatus())) {
                hold.setStatus(SeatHoldStatus.RELEASED);
                hold.setLastReconciledAt(LocalDateTime.now());
                seatHoldRepository.save(hold);
                logger.info("SeatHold {} (order: {}) explicitly RELEASED by user {}. Capacity freed.",
                        hold.getId(), hold.getRazorpayOrderId(), userId);
                return true;
            }

            logger.info("SeatHold {} is in state {}, cannot be released.", hold.getId(), hold.getStatus());
            return false;
        });
    }

    /**
     * Transition hold to FAILED when order creation definitely failed without remote side effects.
     */
    @Transactional
    public void markHoldFailed(Long holdId, String reason) {
        executeWithoutResult(status -> {
            seatHoldRepository.findByIdForUpdate(holdId).ifPresent(hold -> {
                if (SeatHoldStatus.PENDING_ORDER.equals(hold.getStatus())) {
                    hold.setStatus(SeatHoldStatus.FAILED);
                    hold.setLastReconciledAt(LocalDateTime.now());
                    seatHoldRepository.save(hold);
                    logger.info("SeatHold {} marked FAILED: {}", holdId, reason);
                }
            });
        });
    }

    /**
     * Preserves capacity when order creation succeeded remotely but local attachment failed.
     * Transitions hold to EXPIRED_UNRECONCILED with orderId attached so sweeper can safely reconcile.
     */
    public void preserveUnreconciledHold(Long holdId, String razorpayOrderId, String reason) {
        try {
            executeWithoutResult(status -> {
                seatHoldRepository.findByIdForUpdate(holdId).ifPresent(hold -> {
                    hold.setRazorpayOrderId(razorpayOrderId);
                    hold.setStatus(SeatHoldStatus.EXPIRED_UNRECONCILED);
                    hold.setLastReconciledAt(LocalDateTime.now());
                    seatHoldRepository.save(hold);
                    logger.info("SeatHold {} preserved as EXPIRED_UNRECONCILED with order {}: {}", holdId, razorpayOrderId, reason);
                });
            });
        } catch (Exception ex) {
            logger.error("Failed to transition hold {} to EXPIRED_UNRECONCILED: {}", holdId, ex.getMessage(), ex);
        }
    }

    /**
     * Complete two-phase checkout orchestration:
     * 1. Transaction A: Reserve capacity under lock (via TransactionTemplate).
     * 2. External Call: Create Razorpay order (NO lock, NO DB transaction).
     * 3. Transaction B: Attach order and set HELD status (via TransactionTemplate).
     * 4. Failure recovery: Reconcile ambiguous timeouts via receipt lookup or retain EXPIRED_UNRECONCILED.
     */
    public Map<String, Object> createOrderAndHold(Long userId, Long rideId, Long amountPaise,
                                                   Integer seats,
                                                   Double pickupLat, Double pickupLng,
                                                   Double dropLat, Double dropLng) {
        // Phase A: Reserve capacity under pessimistic write lock in a short Spring-managed transaction
        ReservationResult reservation = executeInTransaction(status -> reserveHold(
                rideId, seats, userId, amountPaise, pickupLat, pickupLng, dropLat, dropLng));

        Long holdId = reservation.getHoldId();
        String receipt = reservation.getReceipt();
        Long verifiedAmount = reservation.getVerifiedAmountPaise();

        String orderId = null;
        try {
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", verifiedAmount);
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", receipt);
            orderRequest.put("notes", new JSONObject()
                    .put("holdReference", reservation.getHoldReference())
                    .put("holdId", holdId.toString())
                    .put("rideId", rideId.toString())
                    .put("userId", userId.toString())
                    .put("seats", seats.toString()));

            logger.info("Calling Razorpay orders.create - HoldId: {}, Amount: {} paise, Receipt: {}",
                    holdId, verifiedAmount, receipt);

            // External gateway call: Strictly OUTSIDE any database locks or transactions
            Order razorpayOrder = razorpayClient.orders.create(orderRequest);
            orderId = razorpayOrder.get("id").toString();

            // Phase B: Attach order and transition hold to HELD in a second short Spring-managed transaction
            final String finalOrderId = orderId;
            SeatHold held = executeInTransaction(status -> attachOrder(holdId, finalOrderId));

            Map<String, Object> result = new HashMap<>();
            result.put("orderId", orderId);
            result.put("amount", verifiedAmount);
            result.put("currency", "INR");
            result.put("rideId", rideId);
            result.put("userId", userId);
            result.put("holdId", held.getId());
            result.put("expiresAt", held.getExpiresAt().toString());
            return result;

        } catch (RazorpayException e) {
            logger.error("Razorpay exception during order creation for hold {}: {}", holdId, e.getMessage());
            return handleOrderCreationFailure(reservation, e, verifiedAmount);
        } catch (Exception e) {
            logger.error("Unexpected error creating or attaching order for hold {}: {}", holdId, e.getMessage(), e);
            if (orderId != null) {
                // Razorpay order exists remotely: DO NOT mark FAILED (do not free capacity)!
                logger.warn("Phase B failed after Razorpay order {} was created for hold {}. Preserving hold for reconciliation.", orderId, holdId);
                preserveUnreconciledHold(holdId, orderId, e.getMessage());
            } else {
                markHoldFailed(holdId, e.getMessage());
            }
            throw new RuntimeException("Error creating order: " + e.getMessage(), e);
        }
    }

    /**
     * Reconciles ambiguous order creation failures or timeouts without prematurely releasing capacity.
     */
    private Map<String, Object> handleOrderCreationFailure(ReservationResult reservation,
                                                          RazorpayException exception,
                                                          Long verifiedAmount) {
        Long holdId = reservation.getHoldId();
        String receipt = reservation.getReceipt();

        logger.warn("Reconciling order creation failure for hold {} with receipt {}", holdId, receipt);

        // Attempt receipt lookup to check if Razorpay actually created the order
        try {
            JSONObject query = new JSONObject();
            query.put("receipt", receipt);
            List<Order> orders = razorpayClient.orders.fetchAll(query);

            if (orders != null && !orders.isEmpty()) {
                Order matched = orders.get(0);
                String orderId = matched.get("id").toString();
                logger.info("Reconciliation SUCCESS: Remote order {} found for hold {}", orderId, holdId);

                SeatHold held = executeInTransaction(status -> attachOrder(holdId, orderId));

                Map<String, Object> result = new HashMap<>();
                result.put("orderId", orderId);
                result.put("amount", verifiedAmount);
                result.put("currency", "INR");
                result.put("rideId", reservation.getRideId());
                result.put("userId", reservation.getUserId());
                result.put("holdId", held.getId());
                result.put("expiresAt", held.getExpiresAt().toString());
                return result;
            }
        } catch (Exception lookupEx) {
            logger.warn("Receipt lookup failed or was inconclusive for hold {}: {}", holdId, lookupEx.getMessage());
        }

        // If error is definitely a client validation failure (e.g. 400 Bad Request):
        if (exception.getMessage() != null && exception.getMessage().contains("BAD_REQUEST")) {
            markHoldFailed(holdId, exception.getMessage());
            throw new RuntimeException("Failed to create order: " + exception.getMessage(), exception);
        }

        // If inconclusive (timeout, 5xx): DO NOT release capacity immediately!
        // Leave hold in PENDING_ORDER for its 90s TTL so the sweeper reconciles safely.
        logger.warn("Order creation for hold {} remains inconclusive. Retaining PENDING_ORDER reservation.", holdId);
        throw new RuntimeException("Payment gateway is temporarily unresponsive. Please retry in a moment.");
    }
}