package com.Startup.chalre.service;

import com.Startup.chalre.DTO.BookingDTO;
import com.Startup.chalre.DTO.PaymentFinalizationCommand;
import com.Startup.chalre.DTO.PaymentFinalizationResult;
import com.Startup.chalre.entity.*;
import com.Startup.chalre.repository.*;
import com.razorpay.RazorpayClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class PaymentFinalizationServiceTest {

    @Mock
    private RideRepository rideRepository;
    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private SeatHoldRepository seatHoldRepository;
    @Mock
    private RefundOutboxRepository refundOutboxRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private RazorpayClient razorpayClient;

    private PaymentFinalizationService finalizationService;
    private BookingService bookingService;

    private static final String TEST_SECRET = "test_razorpay_secret_key_12345";

    private User driver;
    private User passengerA;
    private User passengerB;
    private Ride ride;

    @BeforeEach
    void setUp() {
        finalizationService = new PaymentFinalizationService(
                rideRepository,
                bookingRepository,
                paymentRepository,
                seatHoldRepository,
                refundOutboxRepository,
                userRepository,
                notificationService,
                TEST_SECRET,
                razorpayClient
        );

        bookingService = new BookingService(
                rideRepository,
                bookingRepository,
                notificationService,
                paymentRepository,
                seatHoldRepository
        );

        driver = new User();
        driver.setId(1L);
        driver.setName("Driver Bob");
        driver.setEmail("driver@chalre.test");

        passengerA = new User();
        passengerA.setId(2L);
        passengerA.setName("Passenger Alice");
        passengerA.setEmail("alice@chalre.test");

        passengerB = new User();
        passengerB.setId(3L);
        passengerB.setName("Passenger Charlie");
        passengerB.setEmail("charlie@chalre.test");

        ride = new Ride();
        ride.setId(100L);
        ride.setDriver(driver);
        ride.setAvailableSeats(1);
        ride.setDate(LocalDate.now().plusDays(2).toString());
        ride.setTime("10:00");
        ride.setPrice(400.0);
        ride.setStartLocation("Kothrud, Pune");
        ride.setEndLocation("Bandra, Mumbai");
    }

    private String generateValidSignature(String orderId, String paymentId) {
        try {
            String payload = orderId + "|" + paymentId;
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(TEST_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
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

    @Test
    @DisplayName("1. Successful payment with active hold confirms booking exactly once and decrements seats")
    void testSuccessfulPayment_ConfirmsBookingExactlyOnce() {
        String orderId = "order_abc123";
        String paymentId = "pay_xyz789";
        String validSig = generateValidSignature(orderId, paymentId);

        SeatHold hold = SeatHold.builder()
                .id(50L)
                .ride(ride)
                .user(passengerA)
                .seatsHeld(1)
                .holdReference("hld_test_1")
                .status(SeatHoldStatus.HELD)
                .razorpayOrderId(orderId)
                .createdAt(LocalDateTime.now().minusMinutes(1))
                .expiresAt(LocalDateTime.now().plusMinutes(4))
                .build();

        when(rideRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(ride));
        when(paymentRepository.findByRazorpayPaymentId(paymentId)).thenReturn(Optional.empty());
        when(seatHoldRepository.findByRazorpayOrderId(orderId)).thenReturn(Optional.of(hold));
        when(seatHoldRepository.findByIdForUpdate(50L)).thenReturn(Optional.of(hold));

        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> {
            Payment p = invocation.getArgument(0);
            p.setId(10L);
            return p;
        });

        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> {
            Booking b = invocation.getArgument(0);
            b.setId(20L);
            return b;
        });

        PaymentFinalizationCommand cmd = PaymentFinalizationCommand.builder()
                .razorpayPaymentId(paymentId)
                .razorpayOrderId(orderId)
                .razorpaySignature(validSig)
                .rideId(100L)
                .seats(1)
                .amountPaise(40000L)
                .userId(passengerA.getId())
                .signaturePreVerified(false)
                .build();

        PaymentFinalizationResult result = finalizationService.finalizePaymentAndBooking(cmd, passengerA);

        assertTrue(result.isSuccess());
        assertFalse(result.isAlreadyProcessed());
        assertEquals("SUCCESS", result.getStatus());
        assertEquals(20L, result.getBookingId());
        assertEquals(10L, result.getPaymentId());

        // Authoritative state verifications
        assertEquals(SeatHoldStatus.COMPLETED, hold.getStatus());
        assertEquals(0, ride.getAvailableSeats());
        verify(rideRepository, times(1)).save(ride);
        verify(bookingRepository, times(1)).save(any(Booking.class));
        verify(paymentRepository, times(1)).save(any(Payment.class));
    }

    @Test
    @DisplayName("2. Duplicate /verify call returns existing booking idempotently without double-decrementing")
    void testDuplicateVerify_ReturnsIdempotentResult() {
        String paymentId = "pay_already_processed";
        String orderId = "order_already_processed";
        String validSig = generateValidSignature(orderId, paymentId);

        Payment existingPayment = new Payment();
        existingPayment.setId(99L);
        existingPayment.setStatus(Payment.PaymentStatus.SUCCESS);
        existingPayment.setRazorpayPaymentId(paymentId);

        Booking existingBooking = new Booking();
        existingBooking.setId(88L);
        existingBooking.setTxnId(paymentId);

        when(paymentRepository.findByRazorpayPaymentId(paymentId)).thenReturn(Optional.of(existingPayment));
        when(bookingRepository.findByTxnId(paymentId)).thenReturn(Optional.of(existingBooking));

        PaymentFinalizationCommand cmd = PaymentFinalizationCommand.builder()
                .razorpayPaymentId(paymentId)
                .razorpayOrderId(orderId)
                .razorpaySignature(validSig)
                .rideId(100L)
                .seats(1)
                .amountPaise(40000L)
                .userId(passengerA.getId())
                .signaturePreVerified(false)
                .build();

        PaymentFinalizationResult result = finalizationService.finalizePaymentAndBooking(cmd, passengerA);

        assertTrue(result.isSuccess());
        assertTrue(result.isAlreadyProcessed());
        assertEquals(88L, result.getBookingId());
        assertEquals(99L, result.getPaymentId());

        // Verify ride row was NOT locked and seats were NOT decremented
        verify(rideRepository, never()).findByIdForUpdate(anyLong());
        verify(rideRepository, never()).save(any(Ride.class));
        verify(bookingRepository, never()).save(any(Booking.class));
    }

    @Test
    @DisplayName("3. Concurrent finalization race detected under ride lock returns idempotent response")
    void testConcurrentFinalizationRace_HandledUnderLock() {
        String orderId = "order_race";
        String paymentId = "pay_race";
        String validSig = generateValidSignature(orderId, paymentId);

        // First pre-check returns empty (simulating race before 1st thread committed)
        // Under ride lock, payment is found already created by concurrent thread
        Payment committedPayment = new Payment();
        committedPayment.setId(101L);
        committedPayment.setStatus(Payment.PaymentStatus.SUCCESS);

        Booking committedBooking = new Booking();
        committedBooking.setId(202L);

        when(paymentRepository.findByRazorpayPaymentId(paymentId))
                .thenReturn(Optional.empty()) // Fast pre-check
                .thenReturn(Optional.of(committedPayment)); // Second check under lock

        when(rideRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(ride));
        when(bookingRepository.findByTxnId(paymentId)).thenReturn(Optional.of(committedBooking));

        PaymentFinalizationCommand cmd = PaymentFinalizationCommand.builder()
                .razorpayPaymentId(paymentId)
                .razorpayOrderId(orderId)
                .razorpaySignature(validSig)
                .rideId(100L)
                .seats(1)
                .amountPaise(40000L)
                .userId(passengerA.getId())
                .signaturePreVerified(false)
                .build();

        PaymentFinalizationResult result = finalizationService.finalizePaymentAndBooking(cmd, passengerA);

        assertTrue(result.isSuccess());
        assertTrue(result.isAlreadyProcessed());
        assertEquals(202L, result.getBookingId());
        assertEquals(101L, result.getPaymentId());

        // Ensure no second booking or seat deduction occurred
        verify(rideRepository, never()).save(any(Ride.class));
        verify(bookingRepository, never()).save(any(Booking.class));
    }

    @Test
    @DisplayName("4. Expired hold with remaining capacity salvages successfully")
    void testExpiredHold_WithRemainingCapacity_SalvagedSuccessfully() {
        String orderId = "order_expired_salvage";
        String paymentId = "pay_expired_salvage";
        String validSig = generateValidSignature(orderId, paymentId);

        // Hold expired 2 minutes ago
        SeatHold expiredHold = SeatHold.builder()
                .id(60L)
                .ride(ride)
                .user(passengerA)
                .seatsHeld(1)
                .holdReference("hld_test_expired")
                .status(SeatHoldStatus.HELD)
                .razorpayOrderId(orderId)
                .createdAt(LocalDateTime.now().minusMinutes(7))
                .expiresAt(LocalDateTime.now().minusMinutes(2))
                .build();

        ride.setAvailableSeats(1); // 1 seat available

        when(rideRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(ride));
        when(paymentRepository.findByRazorpayPaymentId(paymentId)).thenReturn(Optional.empty());
        when(seatHoldRepository.findByRazorpayOrderId(orderId)).thenReturn(Optional.of(expiredHold));
        when(seatHoldRepository.findByIdForUpdate(60L)).thenReturn(Optional.of(expiredHold));
        // No other active holds on the ride
        when(seatHoldRepository.sumActiveHeldSeats(eq(100L), anyList(), any(LocalDateTime.class), eq(60L)))
                .thenReturn(0);

        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> {
            Payment p = invocation.getArgument(0);
            p.setId(12L);
            return p;
        });

        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> {
            Booking b = invocation.getArgument(0);
            b.setId(22L);
            return b;
        });

        PaymentFinalizationCommand cmd = PaymentFinalizationCommand.builder()
                .razorpayPaymentId(paymentId)
                .razorpayOrderId(orderId)
                .razorpaySignature(validSig)
                .rideId(100L)
                .seats(1)
                .amountPaise(40000L)
                .userId(passengerA.getId())
                .signaturePreVerified(false)
                .build();

        PaymentFinalizationResult result = finalizationService.finalizePaymentAndBooking(cmd, passengerA);

        assertTrue(result.isSuccess());
        assertEquals("SUCCESS", result.getStatus());
        assertEquals(SeatHoldStatus.COMPLETED, expiredHold.getStatus());
        assertEquals(0, ride.getAvailableSeats());
        verify(bookingRepository, times(1)).save(any(Booking.class));
        verify(refundOutboxRepository, never()).save(any(RefundOutbox.class));
    }

    @Test
    @DisplayName("5. Expired hold with lost capacity triggers durable RefundOutbox and REFUND_PENDING payment")
    void testExpiredHold_WithLostCapacity_TriggersDurableRefund() {
        String orderId = "order_expired_lost";
        String paymentId = "pay_expired_lost";
        String validSig = generateValidSignature(orderId, paymentId);

        SeatHold expiredHold = SeatHold.builder()
                .id(70L)
                .ride(ride)
                .user(passengerA)
                .seatsHeld(1)
                .holdReference("hld_test_lost")
                .status(SeatHoldStatus.HELD)
                .razorpayOrderId(orderId)
                .createdAt(LocalDateTime.now().minusMinutes(7))
                .expiresAt(LocalDateTime.now().minusMinutes(2))
                .build();

        // Capacity already gone: availableSeats = 0
        ride.setAvailableSeats(0);

        when(rideRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(ride));
        when(paymentRepository.findByRazorpayPaymentId(paymentId)).thenReturn(Optional.empty());
        when(seatHoldRepository.findByRazorpayOrderId(orderId)).thenReturn(Optional.of(expiredHold));
        when(seatHoldRepository.findByIdForUpdate(70L)).thenReturn(Optional.of(expiredHold));
        when(seatHoldRepository.sumActiveHeldSeats(eq(100L), anyList(), any(LocalDateTime.class), eq(70L)))
                .thenReturn(0);

        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> {
            Payment p = invocation.getArgument(0);
            p.setId(15L);
            return p;
        });

        when(refundOutboxRepository.save(any(RefundOutbox.class))).thenAnswer(invocation -> {
            RefundOutbox r = invocation.getArgument(0);
            r.setId(30L);
            return r;
        });

        PaymentFinalizationCommand cmd = PaymentFinalizationCommand.builder()
                .razorpayPaymentId(paymentId)
                .razorpayOrderId(orderId)
                .razorpaySignature(validSig)
                .rideId(100L)
                .seats(1)
                .amountPaise(40000L)
                .userId(passengerA.getId())
                .signaturePreVerified(false)
                .build();

        PaymentFinalizationResult result = finalizationService.finalizePaymentAndBooking(cmd, passengerA);

        assertFalse(result.isSuccess());
        assertTrue(result.isRefundInitiated());
        assertEquals("REFUND_PENDING", result.getStatus());
        assertEquals(15L, result.getPaymentId());
        assertEquals(30L, result.getRefundOutboxId());

        // Critical safety checks:
        // 1. Available seats NOT decremented (remains 0)
        assertEquals(0, ride.getAvailableSeats());
        // 2. Booking NOT created
        verify(bookingRepository, never()).save(any(Booking.class));
        // 3. Hold marked EXPIRED
        assertEquals(SeatHoldStatus.EXPIRED, expiredHold.getStatus());

        // 4. RefundOutbox captured with correct idempotencyKey and receipt
        ArgumentCaptor<RefundOutbox> outboxCaptor = ArgumentCaptor.forClass(RefundOutbox.class);
        verify(refundOutboxRepository, times(1)).save(outboxCaptor.capture());
        RefundOutbox outbox = outboxCaptor.getValue();
        assertEquals("pay_expired_lost", outbox.getRazorpayPaymentId());
        assertEquals(40000L, outbox.getAmountPaise());
        assertEquals(RefundStatus.PENDING, outbox.getStatus());
        assertEquals("rfnd_op_15_pay_expired_lost", outbox.getIdempotencyKey());
        assertEquals("rcpt_15", outbox.getReceipt());
    }

    @Test
    @DisplayName("6. Refund outbox deduplication: Repeated calls do not duplicate RefundOutbox records")
    void testRefundOutboxDeduplication_DoesNotDuplicateOutbox() {
        String orderId = "order_refund_dup";
        String paymentId = "pay_refund_dup";
        String validSig = generateValidSignature(orderId, paymentId);

        SeatHold expiredHold = SeatHold.builder()
                .id(75L)
                .ride(ride)
                .user(passengerA)
                .seatsHeld(1)
                .holdReference("hld_test_dup")
                .status(SeatHoldStatus.HELD)
                .razorpayOrderId(orderId)
                .createdAt(LocalDateTime.now().minusMinutes(10))
                .expiresAt(LocalDateTime.now().minusMinutes(5))
                .build();

        ride.setAvailableSeats(0);

        when(rideRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(ride));
        when(paymentRepository.findByRazorpayPaymentId(paymentId)).thenReturn(Optional.empty());
        when(seatHoldRepository.findByRazorpayOrderId(orderId)).thenReturn(Optional.of(expiredHold));
        when(seatHoldRepository.findByIdForUpdate(75L)).thenReturn(Optional.of(expiredHold));

        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> {
            Payment p = invocation.getArgument(0);
            p.setId(18L);
            return p;
        });

        // Simulate that outbox was already saved previously with same idempotency key
        RefundOutbox existingOutbox = RefundOutbox.builder()
                .id(35L)
                .idempotencyKey("rfnd_op_18_" + paymentId)
                .status(RefundStatus.PENDING)
                .build();
        when(refundOutboxRepository.findByIdempotencyKey("rfnd_op_18_" + paymentId))
                .thenReturn(Optional.of(existingOutbox));

        PaymentFinalizationCommand cmd = PaymentFinalizationCommand.builder()
                .razorpayPaymentId(paymentId)
                .razorpayOrderId(orderId)
                .razorpaySignature(validSig)
                .rideId(100L)
                .seats(1)
                .amountPaise(40000L)
                .userId(passengerA.getId())
                .signaturePreVerified(false)
                .build();

        PaymentFinalizationResult result = finalizationService.finalizePaymentAndBooking(cmd, passengerA);

        assertFalse(result.isSuccess());
        assertTrue(result.isRefundInitiated());
        assertEquals(35L, result.getRefundOutboxId());

        // refundOutboxRepository.save() should NOT be called when existing outbox is found
        verify(refundOutboxRepository, never()).save(any(RefundOutbox.class));
    }

    @Test
    @DisplayName("7. Invalid payment signature is rejected immediately without acquiring locks")
    void testInvalidSignature_Rejection() {
        PaymentFinalizationCommand cmd = PaymentFinalizationCommand.builder()
                .razorpayPaymentId("pay_tampered")
                .razorpayOrderId("order_tampered")
                .razorpaySignature("invalid_tampered_signature_hex")
                .rideId(100L)
                .seats(1)
                .amountPaise(40000L)
                .userId(passengerA.getId())
                .signaturePreVerified(false)
                .build();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                finalizationService.finalizePaymentAndBooking(cmd, passengerA)
        );

        assertTrue(ex.getMessage().contains("signature verification failed"));
        verify(rideRepository, never()).findByIdForUpdate(anyLong());
        verify(paymentRepository, never()).save(any(Payment.class));
    }

    @Test
    @DisplayName("8. SeatHold ownership mismatch triggers SecurityException")
    void testHoldOwnershipMismatch_ThrowsSecurityException() {
        String orderId = "order_alice";
        String paymentId = "pay_alice";
        String validSig = generateValidSignature(orderId, paymentId);

        // Hold belongs to Passenger Alice (ID 2)
        SeatHold hold = SeatHold.builder()
                .id(50L)
                .ride(ride)
                .user(passengerA)
                .seatsHeld(1)
                .holdReference("hld_test_alice")
                .status(SeatHoldStatus.HELD)
                .razorpayOrderId(orderId)
                .createdAt(LocalDateTime.now().minusMinutes(1))
                .expiresAt(LocalDateTime.now().plusMinutes(4))
                .build();

        when(rideRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(ride));
        when(paymentRepository.findByRazorpayPaymentId(paymentId)).thenReturn(Optional.empty());
        when(seatHoldRepository.findByRazorpayOrderId(orderId)).thenReturn(Optional.of(hold));
        when(seatHoldRepository.findByIdForUpdate(50L)).thenReturn(Optional.of(hold));

        // Passenger Charlie (ID 3) attempts to finalize Alice's order
        PaymentFinalizationCommand cmd = PaymentFinalizationCommand.builder()
                .razorpayPaymentId(paymentId)
                .razorpayOrderId(orderId)
                .razorpaySignature(validSig)
                .rideId(100L)
                .seats(1)
                .amountPaise(40000L)
                .userId(passengerB.getId())
                .signaturePreVerified(false)
                .build();

        SecurityException ex = assertThrows(SecurityException.class, () ->
                finalizationService.finalizePaymentAndBooking(cmd, passengerB)
        );

        assertTrue(ex.getMessage().contains("does not belong to the authenticated user"));
        verify(bookingRepository, never()).save(any(Booking.class));
    }

    @Test
    @DisplayName("9. Missing validation fields throw IllegalArgumentException")
    void testMissingValidationFields() {
        PaymentFinalizationCommand cmdMissingPaymentId = PaymentFinalizationCommand.builder()
                .razorpayPaymentId("")
                .razorpayOrderId("order_123")
                .rideId(100L)
                .seats(1)
                .build();
        assertThrows(IllegalArgumentException.class, () ->
                finalizationService.finalizePaymentAndBooking(cmdMissingPaymentId, passengerA)
        );

        PaymentFinalizationCommand cmdMissingOrderId = PaymentFinalizationCommand.builder()
                .razorpayPaymentId("pay_123")
                .razorpayOrderId("")
                .rideId(100L)
                .seats(1)
                .build();
        assertThrows(IllegalArgumentException.class, () ->
                finalizationService.finalizePaymentAndBooking(cmdMissingOrderId, passengerA)
        );

        PaymentFinalizationCommand cmdInvalidSeats = PaymentFinalizationCommand.builder()
                .razorpayPaymentId("pay_123")
                .razorpayOrderId("order_123")
                .rideId(100L)
                .seats(0)
                .build();
        assertThrows(IllegalArgumentException.class, () ->
                finalizationService.finalizePaymentAndBooking(cmdInvalidSeats, passengerA)
        );
    }

    @Test
    @DisplayName("10. Existing cash booking and cancellation regression pass")
    void testCashBookingAndCancelRegression() {
        ride.setAvailableSeats(2);
        when(rideRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(ride));
        when(seatHoldRepository.sumActiveHeldSeats(eq(100L), anyList(), any(LocalDateTime.class), isNull()))
                .thenReturn(0);

        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> {
            Booking b = invocation.getArgument(0);
            b.setId(501L);
            return b;
        });

        BookingDTO cashDto = new BookingDTO();
        cashDto.setRideId(100L);
        cashDto.setSeats(1);
        cashDto.setPaymentMethod("CASH");

        Booking cashBooking = bookingService.bookRide(cashDto, passengerA);
        assertNotNull(cashBooking);
        assertEquals("BOOKED", cashBooking.getStatus());
        assertEquals("CASH", cashBooking.getPaymentMethod());
        assertEquals("PENDING", cashBooking.getPaymentStatus());

        // Test cancel booking
        cashBooking.setStatus("BOOKED");
        cashBooking.setSeatsBooked(1);
        cashBooking.setRide(ride);
        cashBooking.setUser(passengerA);
        when(bookingRepository.findById(501L)).thenReturn(Optional.of(cashBooking));

        String cancelMsg = bookingService.cancelBooking(501L, passengerA);
        assertEquals("Booking cancelled successfully", cancelMsg);
        assertEquals("CANCELLED", cashBooking.getStatus());
        verify(bookingRepository, atLeastOnce()).save(cashBooking);
    }
}
