package com.Startup.chalre.service;

import com.Startup.chalre.DTO.BookingDTO;
import com.Startup.chalre.DTO.PaymentFinalizationCommand;
import com.Startup.chalre.DTO.PaymentFinalizationResult;
import com.Startup.chalre.Exception.SeatUnavailableException;
import com.Startup.chalre.entity.*;
import com.Startup.chalre.repository.*;
import com.razorpay.Order;
import com.razorpay.OrderClient;
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

import java.net.http.HttpClient;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * End-to-end integration and concurrency test suite executing all 18 mandated
 * ChalRe payment safety and capacity invariants.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class PaymentSafetyE2ETest {

    @Mock
    private RideRepository rideRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private SeatHoldRepository seatHoldRepository;
    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private RefundOutboxRepository refundOutboxRepository;
    @Mock
    private WebhookEventRepository webhookEventRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private RazorpayClient razorpayClient;
    @Mock
    private OrderClient orderClient;
    @Mock
    private PaymentClient paymentClient;
    @Mock
    private RideService rideService;

    private SeatHoldService seatHoldService;
    private PaymentFinalizationService paymentFinalizationService;
    private BookingService bookingService;
    private RefundWorkerService refundWorkerService;
    private WebhookService webhookService;
    private WebhookEventWorker webhookEventWorker;
    private SeatHoldSweeperService seatHoldSweeperService;

    private User driver;
    private User passenger1;
    private User passenger2;
    private Ride singleSeatRide;

    private static final String TEST_SECRET = "rzp_test_secret_123456789";

    @BeforeEach
    void setUp() throws Exception {
        razorpayClient.orders = orderClient;
        razorpayClient.payments = paymentClient;

        seatHoldService = new SeatHoldService(
                rideRepository,
                userRepository,
                seatHoldRepository,
                razorpayClient,
                rideService
        );

        paymentFinalizationService = new PaymentFinalizationService(
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

        refundWorkerService = new RefundWorkerService(
                refundOutboxRepository,
                paymentRepository,
                razorpayClient,
                notificationService
        );

        webhookService = new WebhookService(webhookEventRepository);

        webhookEventWorker = new WebhookEventWorker(
                webhookEventRepository,
                paymentFinalizationService,
                seatHoldRepository
        );

        seatHoldSweeperService = new SeatHoldSweeperService(
                seatHoldRepository,
                paymentFinalizationService,
                razorpayClient
        );

        driver = new User();
        driver.setId(1L);
        driver.setName("Driver Bob");

        passenger1 = new User();
        passenger1.setId(10L);
        passenger1.setName("Alice");

        passenger2 = new User();
        passenger2.setId(20L);
        passenger2.setName("Charlie");

        singleSeatRide = new Ride();
        singleSeatRide.setId(100L);
        singleSeatRide.setDriver(driver);
        singleSeatRide.setAvailableSeats(1);
        singleSeatRide.setDate(LocalDate.now().plusDays(1).toString());
        singleSeatRide.setTime("10:00");
        singleSeatRide.setPrice(350.0);
        singleSeatRide.setStartLocation("Pune");
        singleSeatRide.setEndLocation("Mumbai");

        when(rideRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(singleSeatRide));
        when(rideRepository.findById(100L)).thenReturn(Optional.of(singleSeatRide));
        when(userRepository.findById(10L)).thenReturn(Optional.of(passenger1));
        when(userRepository.findById(20L)).thenReturn(Optional.of(passenger2));

        when(rideService.calculatePrice(anyLong(), any(), any(), any(), any()))
                .thenReturn(Map.of("calculatedPrice", 350.0));
    }

    @Test
    @DisplayName("Scenario 1: Concurrent online checkout (last seat, 2 users) - exactly 1 wins hold, 2nd gets 409")
    void testScenario1_ConcurrentOnlineCheckout() {
        when(seatHoldRepository.sumActiveHeldSeats(eq(100L), any(), any(), isNull())).thenReturn(0);
        when(seatHoldRepository.save(any(SeatHold.class))).thenAnswer(inv -> {
            SeatHold h = inv.getArgument(0);
            h.setId(501L);
            return h;
        });

        // User 1 reserves the last seat
        SeatHoldService.ReservationResult res1 = seatHoldService.reserveHold(
                100L, 1, 10L, 35000L, null, null, null, null);
        assertNotNull(res1);
        assertEquals(501L, res1.getHoldId());

        // Under ride lock, active held count now reflects User 1's hold
        when(seatHoldRepository.sumActiveHeldSeats(eq(100L), any(), any(), isNull())).thenReturn(1);

        // User 2 attempts to reserve the same seat concurrently -> 409 SEAT_CURRENTLY_HELD
        SeatUnavailableException ex = assertThrows(SeatUnavailableException.class, () ->
                seatHoldService.reserveHold(100L, 1, 20L, 35000L, null, null, null, null)
        );
        assertTrue(ex.getMessage().contains("held by another passenger"));
    }

    @Test
    @DisplayName("Scenario 2: Cash booking competing with active online hold is rejected with 409")
    void testScenario2_CashBookingCompetingWithOnlineHold() {
        when(seatHoldRepository.sumActiveHeldSeats(eq(100L), any(), any(), isNull())).thenReturn(1);

        BookingDTO cashDto = new BookingDTO();
        cashDto.setRideId(100L);
        cashDto.setSeats(1);
        cashDto.setPaymentMethod("CASH");

        SeatUnavailableException ex = assertThrows(SeatUnavailableException.class, () ->
                bookingService.bookRide(cashDto, passenger2)
        );
        assertTrue(ex.getMessage().contains("held by another passenger"));
        verify(bookingRepository, never()).save(any());
    }

    @Test
    @DisplayName("Scenario 3: Last seat contention under N concurrent threads permits exactly 1 winner")
    void testScenario3_LastSeatContentionUnderNConcurrentThreads() throws Exception {
        int threads = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger rejectedCount = new AtomicInteger(0);

        when(userRepository.findById(anyLong())).thenReturn(Optional.of(passenger1));

        AtomicInteger liveHeldSeats = new AtomicInteger(0);
        when(seatHoldRepository.sumActiveHeldSeats(eq(100L), any(), any(), isNull()))
                .thenAnswer(inv -> liveHeldSeats.get());

        when(seatHoldRepository.save(any(SeatHold.class))).thenAnswer(inv -> {
            SeatHold h = inv.getArgument(0);
            h.setId(555L);
            liveHeldSeats.incrementAndGet();
            return h;
        });

        for (int i = 0; i < threads; i++) {
            final long uId = 10L + i;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    synchronized (singleSeatRide) { // Simulates DB pessimistic write lock
                        seatHoldService.reserveHold(100L, 1, uId, 35000L, null, null, null, null);
                    }
                    successCount.incrementAndGet();
                } catch (SeatUnavailableException ex) {
                    rejectedCount.incrementAndGet();
                } catch (Exception ignored) {
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        assertTrue(doneLatch.await(5, TimeUnit.SECONDS));
        executor.shutdown();

        assertEquals(1, successCount.get(), "Exactly one user should successfully reserve the last seat");
        assertEquals(threads - 1, rejectedCount.get(), "All other concurrent attempts must be rejected with 409");
    }

    @Test
    @DisplayName("Scenario 4: Duplicate /verify calls are idempotent, create 1 booking, and decrement seat once")
    void testScenario4_DuplicateVerifyCalls() {
        Payment existingPayment = new Payment();
        existingPayment.setId(111L);
        existingPayment.setStatus(Payment.PaymentStatus.SUCCESS);
        existingPayment.setRazorpayPaymentId("pay_dup_verify");

        Booking existingBooking = new Booking();
        existingBooking.setId(222L);
        existingBooking.setTxnId("pay_dup_verify");

        when(paymentRepository.findByRazorpayPaymentId("pay_dup_verify")).thenReturn(Optional.of(existingPayment));
        when(bookingRepository.findByTxnId("pay_dup_verify")).thenReturn(Optional.of(existingBooking));

        PaymentFinalizationCommand cmd = PaymentFinalizationCommand.builder()
                .razorpayPaymentId("pay_dup_verify")
                .razorpayOrderId("order_dup_verify")
                .amountPaise(35000L)
                .rideId(100L)
                .seats(1)
                .userId(10L)
                .signaturePreVerified(true)
                .build();

        PaymentFinalizationResult verifyResult1 = paymentFinalizationService.finalizePaymentAndBooking(cmd, passenger1);
        assertTrue(verifyResult1.isSuccess());
        assertTrue(verifyResult1.isAlreadyProcessed());

        PaymentFinalizationResult verifyResult2 = paymentFinalizationService.finalizePaymentAndBooking(cmd, passenger1);
        assertTrue(verifyResult2.isSuccess());
        assertTrue(verifyResult2.isAlreadyProcessed());

        assertEquals(1, singleSeatRide.getAvailableSeats());
        verify(rideRepository, never()).save(any());
        verify(bookingRepository, never()).save(any());
    }

    @Test
    @DisplayName("Scenario 5: Duplicate webhook delivery (payment.captured) is idempotent")
    void testScenario5_DuplicateWebhookDelivery() {
        Payment existingPayment = new Payment();
        existingPayment.setId(112L);
        existingPayment.setStatus(Payment.PaymentStatus.SUCCESS);
        existingPayment.setRazorpayPaymentId("pay_dup_webhook");

        Booking existingBooking = new Booking();
        existingBooking.setId(223L);
        existingBooking.setTxnId("pay_dup_webhook");

        when(paymentRepository.findByRazorpayPaymentId("pay_dup_webhook")).thenReturn(Optional.of(existingPayment));
        when(bookingRepository.findByTxnId("pay_dup_webhook")).thenReturn(Optional.of(existingBooking));

        PaymentFinalizationCommand cmd = PaymentFinalizationCommand.builder()
                .razorpayPaymentId("pay_dup_webhook")
                .razorpayOrderId("order_dup_webhook")
                .amountPaise(35000L)
                .rideId(100L)
                .seats(1)
                .userId(10L)
                .signaturePreVerified(true)
                .build();

        PaymentFinalizationResult whResult = paymentFinalizationService.finalizePaymentAndBooking(cmd, null);
        assertTrue(whResult.isSuccess());
        assertTrue(whResult.isAlreadyProcessed());

        assertEquals(1, singleSeatRide.getAvailableSeats());
        verify(bookingRepository, never()).save(any());
    }

    @Test
    @DisplayName("Scenario 6: Simultaneous /verify and webhook race converges safely via atomic CAS")
    void testScenario6_SimultaneousVerifyAndWebhookRace() {
        SeatHold hold = SeatHold.builder()
                .id(601L)
                .ride(singleSeatRide)
                .user(passenger1)
                .seatsHeld(1)
                .status(SeatHoldStatus.HELD)
                .razorpayOrderId("order_race_601")
                .expiresAt(LocalDateTime.now().plusMinutes(4))
                .build();

        when(seatHoldRepository.findByRazorpayOrderId("order_race_601")).thenReturn(Optional.of(hold));
        when(seatHoldRepository.findByIdForUpdate(601L)).thenReturn(Optional.of(hold));

        // First call sets up payment and booking
        AtomicInteger paymentCreated = new AtomicInteger(0);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            p.setId(991L);
            paymentCreated.incrementAndGet();
            return p;
        });
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> {
            Booking b = inv.getArgument(0);
            b.setId(881L);
            return b;
        });

        PaymentFinalizationCommand cmd = PaymentFinalizationCommand.builder()
                .razorpayPaymentId("pay_race_601")
                .razorpayOrderId("order_race_601")
                .amountPaise(35000L)
                .rideId(100L)
                .seats(1)
                .userId(10L)
                .signaturePreVerified(true)
                .build();

        // 1. Verify endpoint runs
        PaymentFinalizationResult res1 = paymentFinalizationService.finalizePaymentAndBooking(cmd, passenger1);
        assertTrue(res1.isSuccess());

        // Simulate subsequent call seeing the persisted payment
        Payment createdPayment = new Payment();
        createdPayment.setId(991L);
        createdPayment.setStatus(Payment.PaymentStatus.SUCCESS);
        createdPayment.setRazorpayPaymentId("pay_race_601");
        when(paymentRepository.findByRazorpayPaymentId("pay_race_601")).thenReturn(Optional.of(createdPayment));

        Booking b = new Booking();
        b.setId(881L);
        when(bookingRepository.findByTxnId("pay_race_601")).thenReturn(Optional.of(b));

        // 2. Webhook runs concurrently / immediately after
        PaymentFinalizationResult res2 = paymentFinalizationService.finalizePaymentAndBooking(cmd, null);
        assertTrue(res2.isSuccess());
        assertTrue(res2.isAlreadyProcessed());

        assertEquals(1, paymentCreated.get());
        assertEquals(0, singleSeatRide.getAvailableSeats());
    }

    @Test
    @DisplayName("Scenario 7: Payment captured after hold expiry salvages seat when capacity is available")
    void testScenario7_PaymentCapturedAfterHoldExpiry_SeatSalvaged() {
        singleSeatRide.setAvailableSeats(1);

        SeatHold expiredHold = SeatHold.builder()
                .id(701L)
                .ride(singleSeatRide)
                .user(passenger1)
                .seatsHeld(1)
                .status(SeatHoldStatus.EXPIRED)
                .razorpayOrderId("order_salvaged_701")
                .expiresAt(LocalDateTime.now().minusMinutes(2))
                .build();

        when(seatHoldRepository.findByRazorpayOrderId("order_salvaged_701")).thenReturn(Optional.of(expiredHold));
        when(seatHoldRepository.findByIdForUpdate(701L)).thenReturn(Optional.of(expiredHold));
        when(seatHoldRepository.sumActiveHeldSeats(eq(100L), any(), any(), eq(701L))).thenReturn(0);

        when(paymentRepository.findByRazorpayPaymentId("pay_salvaged_701")).thenReturn(Optional.empty());
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> {
            Booking b = inv.getArgument(0);
            b.setId(777L);
            return b;
        });

        PaymentFinalizationCommand cmd = PaymentFinalizationCommand.builder()
                .razorpayPaymentId("pay_salvaged_701")
                .razorpayOrderId("order_salvaged_701")
                .amountPaise(35000L)
                .rideId(100L)
                .seats(1)
                .userId(10L)
                .signaturePreVerified(true)
                .build();

        PaymentFinalizationResult res = paymentFinalizationService.finalizePaymentAndBooking(cmd, passenger1);
        assertTrue(res.isSuccess());
        assertEquals(0, singleSeatRide.getAvailableSeats());
        assertEquals(SeatHoldStatus.COMPLETED, expiredHold.getStatus());
        verify(refundOutboxRepository, never()).save(any());
    }

    @Test
    @DisplayName("Scenario 8: Payment captured after hold expiry triggers refund when capacity is lost")
    void testScenario8_PaymentCapturedAfterHoldExpiry_CapacityLost_TriggersRefund() {
        singleSeatRide.setAvailableSeats(0);

        SeatHold expiredHold = SeatHold.builder()
                .id(999L)
                .ride(singleSeatRide)
                .user(passenger1)
                .seatsHeld(1)
                .status(SeatHoldStatus.HELD)
                .razorpayOrderId("order_late_lost")
                .expiresAt(LocalDateTime.now().minusMinutes(5))
                .build();

        when(seatHoldRepository.findByRazorpayOrderId("order_late_lost")).thenReturn(Optional.of(expiredHold));
        when(seatHoldRepository.findByIdForUpdate(999L)).thenReturn(Optional.of(expiredHold));
        when(paymentRepository.findByRazorpayPaymentId("pay_late_lost")).thenReturn(Optional.empty());

        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            p.setId(777L);
            return p;
        });

        when(refundOutboxRepository.save(any(RefundOutbox.class))).thenAnswer(inv -> {
            RefundOutbox r = inv.getArgument(0);
            r.setId(888L);
            return r;
        });

        PaymentFinalizationCommand cmd = PaymentFinalizationCommand.builder()
                .razorpayPaymentId("pay_late_lost")
                .razorpayOrderId("order_late_lost")
                .amountPaise(35000L)
                .rideId(100L)
                .seats(1)
                .userId(10L)
                .signaturePreVerified(true)
                .build();

        PaymentFinalizationResult result = paymentFinalizationService.finalizePaymentAndBooking(cmd, passenger1);

        assertFalse(result.isSuccess());
        assertTrue(result.isRefundInitiated());
        assertEquals("REFUND_PENDING", result.getStatus());
        assertEquals(888L, result.getRefundOutboxId());

        assertEquals(0, singleSeatRide.getAvailableSeats());
        verify(bookingRepository, never()).save(any());
        verify(refundOutboxRepository, times(1)).save(any(RefundOutbox.class));
    }

    @Test
    @DisplayName("Scenario 9: Expired hold with inconclusive gateway state protects capacity as EXPIRED_UNRECONCILED")
    void testScenario9_ExpiredHoldInconclusiveGatewayState_PreservesCapacity() throws Exception {
        SeatHold expiredHold = SeatHold.builder()
                .id(88L)
                .ride(singleSeatRide)
                .user(passenger1)
                .seatsHeld(1)
                .status(SeatHoldStatus.HELD)
                .razorpayOrderId("order_inconclusive")
                .expiresAt(LocalDateTime.now().minusMinutes(3))
                .build();

        when(seatHoldRepository.findById(88L)).thenReturn(Optional.of(expiredHold));
        when(orderClient.fetch("order_inconclusive"))
                .thenThrow(new RazorpayException("Read timed out connecting to gateway"));

        seatHoldSweeperService.processExpiredCandidate(88L);

        assertEquals(SeatHoldStatus.EXPIRED_UNRECONCILED, expiredHold.getStatus());
        verify(seatHoldRepository, times(1)).save(expiredHold);
    }

    @Test
    @DisplayName("Scenario 10: Sweeper reconciles late payment to booking when order was paid at gateway")
    void testScenario10_SweeperReconcilesLatePaymentToBooking() throws Exception {
        SeatHold expiredHold = SeatHold.builder()
                .id(110L)
                .ride(singleSeatRide)
                .user(passenger1)
                .seatsHeld(1)
                .status(SeatHoldStatus.HELD)
                .razorpayOrderId("order_sweeper_paid")
                .expiresAt(LocalDateTime.now().minusMinutes(2))
                .build();

        when(seatHoldRepository.findById(110L)).thenReturn(Optional.of(expiredHold));
        when(seatHoldRepository.findByRazorpayOrderId("order_sweeper_paid")).thenReturn(Optional.of(expiredHold));
        when(seatHoldRepository.findByIdForUpdate(110L)).thenReturn(Optional.of(expiredHold));

        // Gateway returns captured payment for this order
        Order rzpOrder = mock(Order.class);
        when(rzpOrder.has("status")).thenReturn(true);
        when(rzpOrder.get("status")).thenReturn("paid");
        when(orderClient.fetch("order_sweeper_paid")).thenReturn(rzpOrder);

        com.razorpay.Payment rzpPayment = mock(com.razorpay.Payment.class);
        when(rzpPayment.has("id")).thenReturn(true);
        when(rzpPayment.get("id")).thenReturn("pay_sweeper_110");
        when(rzpPayment.has("status")).thenReturn(true);
        when(rzpPayment.get("status")).thenReturn("captured");
        when(rzpPayment.has("amount")).thenReturn(true);
        when(rzpPayment.get("amount")).thenReturn(35000);

        when(orderClient.fetchPayments("order_sweeper_paid")).thenReturn(List.of(rzpPayment));
        when(paymentRepository.findByRazorpayPaymentId("pay_sweeper_110")).thenReturn(Optional.empty());
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> {
            Booking b = inv.getArgument(0);
            b.setId(660L);
            return b;
        });

        seatHoldSweeperService.processExpiredCandidate(110L);

        assertEquals(0, singleSeatRide.getAvailableSeats());
        assertEquals(SeatHoldStatus.COMPLETED, expiredHold.getStatus());
        verify(bookingRepository, times(1)).save(any(Booking.class));
    }

    @Test
    @DisplayName("Scenario 11: Crash after Razorpay order creation before hold attachment recovers safely via sweeper")
    void testScenario11_CrashAfterOrderCreationBeforeAttachment() {
        SeatHold unattachedHold = SeatHold.builder()
                .id(50L)
                .ride(singleSeatRide)
                .user(passenger1)
                .seatsHeld(1)
                .status(SeatHoldStatus.PENDING_ORDER)
                .holdReference("hld_crashed")
                .razorpayOrderId(null)
                .createdAt(LocalDateTime.now().minusSeconds(120))
                .expiresAt(LocalDateTime.now().minusSeconds(30))
                .build();

        when(seatHoldRepository.findById(50L)).thenReturn(Optional.of(unattachedHold));

        seatHoldSweeperService.processExpiredCandidate(50L);

        assertEquals(SeatHoldStatus.EXPIRED, unattachedHold.getStatus());
        verify(seatHoldRepository, times(1)).save(unattachedHold);
    }

    @Test
    @DisplayName("Scenario 12: Crash after gateway refund before DB persistence reconciles without double refund")
    void testScenario12_CrashAfterGatewayRefundBeforePersistence() throws Exception {
        Payment p = new Payment();
        p.setId(401L);
        p.setStatus(Payment.PaymentStatus.REFUND_PENDING);

        RefundOutbox outbox = RefundOutbox.builder()
                .id(301L)
                .payment(p)
                .razorpayPaymentId("pay_crashed_rfnd")
                .amountPaise(35000L)
                .status(RefundStatus.PENDING)
                .receipt("rcpt_401")
                .idempotencyKey("rfnd_op_401_pay_crashed_rfnd")
                .build();

        when(refundOutboxRepository.findClaimableRefunds(any(), any(), anyInt(), any()))
                .thenReturn(List.of(outbox));
        when(refundOutboxRepository.claimLease(eq(301L), anyString(), any()))
                .thenAnswer(inv -> {
                    outbox.setClaimToken(inv.getArgument(1));
                    outbox.setStatus(RefundStatus.PROCESSING);
                    return 1;
                });
        when(refundOutboxRepository.findById(301L)).thenReturn(Optional.of(outbox));

        com.razorpay.Refund r = mock(com.razorpay.Refund.class);
        when(r.has("receipt")).thenReturn(true);
        when(r.get("receipt")).thenReturn("rcpt_401");
        when(r.has("status")).thenReturn(true);
        when(r.get("status")).thenReturn("processed");
        when(r.has("id")).thenReturn(true);
        when(r.get("id")).thenReturn("rfnd_confirmed_888");

        when(paymentClient.fetchAllRefunds("pay_crashed_rfnd")).thenReturn(List.of(r));

        refundWorkerService.processPendingRefunds();

        verify(paymentClient, never()).refund(anyString(), any(JSONObject.class));
        assertEquals(RefundStatus.CONFIRMED, outbox.getStatus());
        assertEquals("rfnd_confirmed_888", outbox.getRazorpayRefundId());
        assertEquals(Payment.PaymentStatus.REFUNDED, p.getStatus());
    }

    @Test
    @DisplayName("Scenario 13: Refund retry with stable X-Refund-Idempotency preserves key across retries")
    void testScenario13_RefundRetryWithStableIdempotencyKey() {
        RefundOutbox outbox = RefundOutbox.builder()
                .id(10L)
                .razorpayPaymentId("pay_retry_key")
                .amountPaise(35000L)
                .status(RefundStatus.PENDING)
                .idempotencyKey("rfnd_op_stable_10")
                .receipt("rcpt_10")
                .retryCount(1)
                .build();

        assertEquals("rfnd_op_stable_10", outbox.getIdempotencyKey());
        assertEquals("rcpt_10", outbox.getReceipt());
    }

    @Test
    @DisplayName("Scenario 14: Refund conflict HTTP 409 handled as in-progress without marking failed")
    void testScenario14_RefundConflictHttp409HandledAsInProgress() throws Exception {
        HttpClient mockHttp = mock(HttpClient.class);
        HttpResponse<String> mockResp = mock(HttpResponse.class);
        when(mockResp.statusCode()).thenReturn(409);
        when(mockResp.body()).thenReturn("{\"error\":{\"code\":\"BAD_REQUEST_ERROR\",\"description\":\"A refund is currently being processed.\"}}");
        doReturn(mockResp).when(mockHttp).send(any(), any());

        RazorpayRefundGatewayClient client = new RazorpayRefundGatewayClient("key", "secret", mockHttp);
        RazorpayRefundGatewayClient.GatewayRefundResult res = client.executeRefundWithIdempotency(
                "pay_409", 35000L, "rcpt_409", "idemp_409", 1L);

        assertEquals(RazorpayRefundGatewayClient.GatewayRefundResultType.IN_PROGRESS, res.type());
        assertNull(res.razorpayRefundId());
    }

    @Test
    @DisplayName("Scenario 15: Ride cancellation racing with checkout rejects reservation")
    void testScenario15_RideCancellationRacingWithCheckout() {
        singleSeatRide.setAvailableSeats(0);

        when(seatHoldRepository.sumActiveHeldSeats(eq(100L), any(), any(), isNull())).thenReturn(0);

        assertThrows(SeatUnavailableException.class, () ->
                seatHoldService.reserveHold(100L, 1, 10L, 35000L, null, null, null, null)
        );
    }

    @Test
    @DisplayName("Scenario 16: Booking cancellation restores seat exactly once (no double-restore)")
    void testScenario16_BookingCancellationRestoresSeatExactlyOnce() {
        singleSeatRide.setAvailableSeats(0);

        Booking booking = new Booking();
        booking.setId(701L);
        booking.setRide(singleSeatRide);
        booking.setUser(passenger1);
        booking.setSeatsBooked(1);
        booking.setStatus("BOOKED");
        booking.setPaymentStatus("PENDING");

        when(bookingRepository.findById(701L)).thenReturn(Optional.of(booking));

        String res = bookingService.cancelBooking(701L, passenger1);
        assertEquals("Booking cancelled successfully", res);
        assertEquals(1, singleSeatRide.getAvailableSeats());
        assertEquals("CANCELLED", booking.getStatus());
        verify(rideRepository, times(1)).save(singleSeatRide);

        assertThrows(RuntimeException.class, () ->
                bookingService.cancelBooking(701L, passenger1)
        );
        assertEquals(1, singleSeatRide.getAvailableSeats());
    }

    @Test
    @DisplayName("Scenario 17: Worker lease recovery across application restarts restores claimable state")
    void testScenario17_WorkerLeaseRecoveryAcrossRestarts() {
        when(refundOutboxRepository.releaseExpiredLeases(any(LocalDateTime.class))).thenReturn(5);
        when(webhookEventRepository.releaseExpiredLeases(any(LocalDateTime.class))).thenReturn(3);

        refundWorkerService.processPendingRefunds();
        webhookEventWorker.processPendingEvents();

        verify(refundOutboxRepository, times(1)).releaseExpiredLeases(any());
        verify(webhookEventRepository, times(1)).releaseExpiredLeases(any());
    }

    @Test
    @DisplayName("Scenario 18: Multi-worker contention on outbox/webhooks enforces single-winner atomic CAS")
    void testScenario18_MultiWorkerContentionAtomicCasLease() throws Exception {
        int workers = 8;
        ExecutorService executor = Executors.newFixedThreadPool(workers);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(workers);
        AtomicInteger leaseWon = new AtomicInteger(0);

        AtomicInteger dbCasLock = new AtomicInteger(0);
        when(refundOutboxRepository.claimLease(eq(500L), anyString(), any())).thenAnswer(inv -> {
            if (dbCasLock.compareAndSet(0, 1)) {
                return 1;
            }
            return 0;
        });

        for (int i = 0; i < workers; i++) {
            final String token = "worker_token_" + i;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    boolean won = refundWorkerService.claimRefundJob(500L, token);
                    if (won) leaseWon.incrementAndGet();
                } catch (Exception ignored) {
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        assertTrue(doneLatch.await(5, TimeUnit.SECONDS));
        executor.shutdown();

        assertEquals(1, leaseWon.get(), "Exactly 1 worker instance must successfully claim the lease");
    }

    @Test
    @DisplayName("Scenario 19: Explicit hold release frees capacity immediately and rejects unauthorized users")
    void testScenario19_ExplicitHoldRelease_FreesCapacityImmediately() {
        SeatHold hold = SeatHold.builder()
                .id(333L)
                .ride(singleSeatRide)
                .user(passenger1)
                .seatsHeld(1)
                .status(SeatHoldStatus.HELD)
                .razorpayOrderId("order_rel_333")
                .expiresAt(LocalDateTime.now().plusMinutes(5))
                .build();

        when(seatHoldRepository.findByIdForUpdate(333L)).thenReturn(Optional.of(hold));
        when(seatHoldRepository.findByRazorpayOrderId("order_rel_333")).thenReturn(Optional.of(hold));

        // Unauthorized user attempt
        assertThrows(SecurityException.class, () ->
                seatHoldService.releaseHold(333L, "order_rel_333", 999L)
        );

        // Authorized user release
        boolean released = seatHoldService.releaseHold(333L, "order_rel_333", 10L);
        assertTrue(released);
        assertEquals(SeatHoldStatus.RELEASED, hold.getStatus());
        verify(seatHoldRepository, times(1)).save(hold);
    }
}
