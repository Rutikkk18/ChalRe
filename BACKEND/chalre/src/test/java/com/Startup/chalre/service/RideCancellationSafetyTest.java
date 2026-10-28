package com.Startup.chalre.service;

import com.Startup.chalre.DTO.BookingDTO;
import com.Startup.chalre.DTO.PaymentFinalizationCommand;
import com.Startup.chalre.DTO.PaymentFinalizationResult;
import com.Startup.chalre.DTO.RideSummaryDTO;
import com.Startup.chalre.Exception.SeatUnavailableException;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class RideCancellationSafetyTest {

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
    private NotificationService notificationService;
    @Mock
    private UserRepository userRepository;
    @Mock
    private MapService mapService;
    @Mock
    private RouteService routeService;
    @Mock
    private RazorpayClient razorpayClient;

    private RefundWorkerService refundWorkerService;
    private SeatHoldService seatHoldService;
    private BookingService bookingService;
    private PaymentFinalizationService paymentFinalizationService;
    private RideService rideService;

    private User driver;
    private User passenger;
    private Ride activeRide;

    private static final String TEST_SECRET = "rzp_test_secret_123456789";

    @BeforeEach
    void setUp() {
        driver = new User();
        driver.setId(10L);
        driver.setName("Driver Alice");

        passenger = new User();
        passenger.setId(20L);
        passenger.setName("Passenger Bob");

        activeRide = new Ride();
        activeRide.setId(100L);
        activeRide.setDriver(driver);
        activeRide.setStatus("ACTIVE");
        activeRide.setAvailableSeats(3);
        activeRide.setPrice(500.0);
        activeRide.setStartLocation("Pune");
        activeRide.setEndLocation("Mumbai");
        activeRide.setDate(LocalDate.now().plusDays(1).toString());
        activeRide.setTime("10:00");
        activeRide.setEndTime("13:00");
        activeRide.setVehicleType("car");

        refundWorkerService = new RefundWorkerService(
                refundOutboxRepository,
                paymentRepository,
                razorpayClient,
                notificationService
        );

        seatHoldService = new SeatHoldService(
                rideRepository,
                userRepository,
                seatHoldRepository,
                razorpayClient,
                null
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

        rideService = new RideService(
                rideRepository,
                notificationService,
                bookingRepository,
                mapService,
                routeService,
                paymentRepository,
                seatHoldRepository,
                refundWorkerService,
                seatHoldService
        );

        when(rideRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(activeRide));
        when(rideRepository.findById(100L)).thenReturn(Optional.of(activeRide));
        when(rideRepository.save(any(Ride.class))).thenAnswer(invocation -> invocation.getArgument(0));

        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> {
            Payment p = invocation.getArgument(0);
            if (p.getId() == null) {
                p.setId(999L);
            }
            return p;
        });

        when(refundOutboxRepository.save(any(RefundOutbox.class))).thenAnswer(invocation -> {
            RefundOutbox r = invocation.getArgument(0);
            if (r.getId() == null) {
                r.setId(888L);
            }
            return r;
        });

        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> {
            Booking b = invocation.getArgument(0);
            if (b.getId() == null) {
                b.setId(777L);
            }
            return b;
        });
    }

    @Test
    @DisplayName("Scenario 1: Cancelling ride with no bookings or holds soft-deactivates ride")
    void testCancelRide_NoBookingsOrHolds() {
        when(bookingRepository.findByRide(activeRide)).thenReturn(Collections.emptyList());
        when(seatHoldRepository.findByRide(activeRide)).thenReturn(Collections.emptyList());

        String result = rideService.cancelRide(100L, driver);

        assertTrue(result.contains("Ride cancelled successfully"));
        assertEquals("CANCELLED", activeRide.getStatus());
        assertEquals(0, activeRide.getAvailableSeats());
        verify(rideRepository, never()).delete(any(Ride.class));
        verify(rideRepository).save(activeRide);
    }

    @Test
    @DisplayName("Scenario 2: Deactivating ride with active checkout hold does not throw, marks ride CANCELLED")
    void testDeleteRide_WithActiveCheckoutHold() {
        when(bookingRepository.findByRide(activeRide)).thenReturn(Collections.emptyList());

        SeatHold pendingHold = SeatHold.builder()
                .id(1L)
                .ride(activeRide)
                .user(passenger)
                .seatsHeld(1)
                .status(SeatHoldStatus.PENDING_ORDER)
                .expiresAt(LocalDateTime.now().plusMinutes(1))
                .build();

        SeatHold activeHeld = SeatHold.builder()
                .id(2L)
                .ride(activeRide)
                .user(passenger)
                .seatsHeld(1)
                .status(SeatHoldStatus.HELD)
                .razorpayOrderId("order_123")
                .expiresAt(LocalDateTime.now().plusMinutes(5))
                .build();

        when(seatHoldRepository.findByRide(activeRide)).thenReturn(List.of(pendingHold, activeHeld));

        String result = rideService.deleteRide(100L, driver);

        assertEquals("Ride deleted successfully", result);
        assertEquals("CANCELLED", activeRide.getStatus());
        assertEquals(0, activeRide.getAvailableSeats());
        verify(rideRepository, never()).delete(any(Ride.class));

        // PENDING_ORDER is released
        assertEquals(SeatHoldStatus.RELEASED, pendingHold.getStatus());
        // HELD remains untouched for background sweeper reconciliation!
        assertEquals(SeatHoldStatus.HELD, activeHeld.getStatus());
    }

    @Test
    @DisplayName("Scenario 3: Deleting ride with active confirmed bookings is rejected with clear message")
    void testDeleteRide_WithActiveConfirmedBookings_ThrowsException() {
        Booking confirmedBooking = new Booking();
        confirmedBooking.setId(501L);
        confirmedBooking.setRide(activeRide);
        confirmedBooking.setUser(passenger);
        confirmedBooking.setStatus("BOOKED");
        confirmedBooking.setSeatsBooked(1);

        when(bookingRepository.findByRide(activeRide)).thenReturn(List.of(confirmedBooking));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> rideService.deleteRide(100L, driver));
        assertEquals("Cannot delete ride with active bookings. Please cancel the ride instead.", ex.getMessage());
        assertEquals("ACTIVE", activeRide.getStatus());
    }

    @Test
    @DisplayName("Scenario 4: Cancelling ride with paid bookings transitions payment to REFUND_PENDING and enqueues outbox refund")
    void testCancelRide_WithPaidBooking_EnqueuesRefundAndRetainsRideLink() {
        Booking paidBooking = new Booking();
        paidBooking.setId(601L);
        paidBooking.setRide(activeRide);
        paidBooking.setUser(passenger);
        paidBooking.setStatus("BOOKED");
        paidBooking.setPaymentStatus("PAID");
        paidBooking.setTxnId("pay_test_123");

        Payment payment = new Payment();
        payment.setId(701L);
        payment.setRazorpayPaymentId("pay_test_123");
        payment.setAmount(50000L);
        payment.setStatus(Payment.PaymentStatus.SUCCESS);

        when(bookingRepository.findByRide(activeRide)).thenReturn(List.of(paidBooking));
        when(paymentRepository.findByRazorpayPaymentId("pay_test_123")).thenReturn(Optional.of(payment));
        when(seatHoldRepository.findByRide(activeRide)).thenReturn(Collections.emptyList());

        String result = rideService.cancelRide(100L, driver);

        assertTrue(result.contains("1 passenger(s) refunded"));
        assertEquals("CANCELLED", activeRide.getStatus());
        assertEquals("CANCELLED", paidBooking.getStatus());
        assertEquals("REFUND_PENDING", paidBooking.getPaymentStatus());

        // Booking MUST remain linked to the ride (never set to null)
        assertNotNull(paidBooking.getRide());
        assertEquals(100L, paidBooking.getRide().getId());

        // Payment status must be REFUND_PENDING
        assertEquals(Payment.PaymentStatus.REFUND_PENDING, payment.getStatus());

        // Verify outbox record created
        ArgumentCaptor<RefundOutbox> outboxCaptor = ArgumentCaptor.forClass(RefundOutbox.class);
        verify(refundOutboxRepository).save(outboxCaptor.capture());
        RefundOutbox outbox = outboxCaptor.getValue();
        assertEquals("pay_test_123", outbox.getRazorpayPaymentId());
        assertEquals(RefundStatus.PENDING, outbox.getStatus());
        assertEquals("rfnd_op_701_pay_test_123", outbox.getIdempotencyKey());
    }

    @Test
    @DisplayName("Scenario 5: Captured payment on cancelled ride routes to Step 3B and enqueues refund")
    void testPaymentFinalization_CancelledRide_RoutesToRefundOutbox() {
        activeRide.setStatus("CANCELLED");
        activeRide.setAvailableSeats(0);

        SeatHold hold = SeatHold.builder()
                .id(301L)
                .ride(activeRide)
                .user(passenger)
                .seatsHeld(1)
                .status(SeatHoldStatus.HELD)
                .razorpayOrderId("order_abc_123")
                .expiresAt(LocalDateTime.now().plusMinutes(5))
                .build();

        when(seatHoldRepository.findByRazorpayOrderId("order_abc_123")).thenReturn(Optional.of(hold));
        when(seatHoldRepository.findByIdForUpdate(301L)).thenReturn(Optional.of(hold));
        when(paymentRepository.findByRazorpayPaymentId("pay_abc_123")).thenReturn(Optional.empty());

        PaymentFinalizationCommand cmd = PaymentFinalizationCommand.builder()
                .rideId(100L)
                .userId(passenger.getId())
                .seats(1)
                .amountPaise(50000L)
                .razorpayOrderId("order_abc_123")
                .razorpayPaymentId("pay_abc_123")
                .razorpaySignature("sig_123")
                .build();

        PaymentFinalizationResult result = paymentFinalizationService.executeAtomicFinalization(cmd, passenger);

        assertFalse(result.isSuccess());
        assertEquals("REFUND_PENDING", result.getStatus());
        assertTrue(result.isRefundInitiated());
        assertTrue(result.getMessage().contains("safely queued"));

        // Verify Payment row created with REFUND_PENDING
        ArgumentCaptor<Payment> paymentCaptor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(paymentCaptor.capture());
        Payment savedPayment = paymentCaptor.getValue();
        assertEquals(Payment.PaymentStatus.REFUND_PENDING, savedPayment.getStatus());
        assertEquals("pay_abc_123", savedPayment.getRazorpayPaymentId());

        // Verify outbox entry created
        ArgumentCaptor<RefundOutbox> outboxCaptor = ArgumentCaptor.forClass(RefundOutbox.class);
        verify(refundOutboxRepository).save(outboxCaptor.capture());
        RefundOutbox savedOutbox = outboxCaptor.getValue();
        assertEquals(RefundStatus.PENDING, savedOutbox.getStatus());
        assertEquals("RIDE_CANCELLED_BEFORE_FINALIZATION", savedOutbox.getFailureReason());
    }

    @Test
    @DisplayName("Scenario 6: Late webhook or duplicate finalization returns idempotent result")
    void testPaymentFinalization_DuplicateCall_IsIdempotent() {
        Payment existingPayment = new Payment();
        existingPayment.setId(888L);
        existingPayment.setRazorpayPaymentId("pay_dup_123");
        existingPayment.setStatus(Payment.PaymentStatus.SUCCESS);

        Booking existingBooking = new Booking();
        existingBooking.setId(444L);

        when(paymentRepository.findByRazorpayPaymentId("pay_dup_123")).thenReturn(Optional.of(existingPayment));
        when(bookingRepository.findByTxnId("pay_dup_123")).thenReturn(Optional.of(existingBooking));

        PaymentFinalizationCommand cmd = PaymentFinalizationCommand.builder()
                .rideId(100L)
                .userId(passenger.getId())
                .seats(1)
                .amountPaise(50000L)
                .razorpayOrderId("order_dup_123")
                .razorpayPaymentId("pay_dup_123")
                .razorpaySignature("sig_dup_123")
                .build();

        PaymentFinalizationResult result = paymentFinalizationService.executeAtomicFinalization(cmd, passenger);

        assertTrue(result.isSuccess());
        assertTrue(result.isAlreadyProcessed());
        assertEquals(888L, result.getPaymentId());
        assertEquals(444L, result.getBookingId());
        verify(paymentRepository, never()).save(any(Payment.class));
    }

    @Test
    @DisplayName("Scenario 7: Concurrency race - Hold creation & Booking creation on cancelled ride are rejected")
    void testReserveHoldAndCreateBooking_OnCancelledRide_ThrowsException() {
        activeRide.setStatus("CANCELLED");
        when(userRepository.findById(passenger.getId())).thenReturn(Optional.of(passenger));

        // 1. Hold reservation must fail
        assertThrows(SeatUnavailableException.class, () ->
                seatHoldService.reserveHold(100L, 1, passenger.getId(), 50000L, 18.5, 73.8, 19.0, 72.8)
        );

        // 2. Direct booking must fail
        BookingDTO dto = new BookingDTO();
        dto.setRideId(100L);
        dto.setSeats(1);
        RuntimeException bookingEx = assertThrows(RuntimeException.class, () ->
                bookingService.bookRide(dto, passenger)
        );
        assertEquals("This ride is no longer active for booking.", bookingEx.getMessage());
    }

    @Test
    @DisplayName("Scenario 8: Cancelled empty rides are excluded from MyRidesSeparated")
    void testGetMyRidesSeparated_ExcludesCancelledEmptyRides() {
        Ride emptyCancelledRide = new Ride();
        emptyCancelledRide.setId(101L);
        emptyCancelledRide.setDriver(driver);
        emptyCancelledRide.setStatus("CANCELLED");
        emptyCancelledRide.setDate(LocalDate.now().plusDays(2).toString());
        emptyCancelledRide.setTime("11:00");
        emptyCancelledRide.setAvailableSeats(0);

        Ride cancelledWithBookings = new Ride();
        cancelledWithBookings.setId(102L);
        cancelledWithBookings.setDriver(driver);
        cancelledWithBookings.setStatus("CANCELLED");
        cancelledWithBookings.setDate(LocalDate.now().plusDays(2).toString());
        cancelledWithBookings.setTime("12:00");
        cancelledWithBookings.setAvailableSeats(0);

        when(rideRepository.findByDriver(driver)).thenReturn(List.of(activeRide, emptyCancelledRide, cancelledWithBookings));

        // Mock counts: 101 has 0 bookings, 102 has 1 booking, 100 has 0 bookings
        List<Object[]> countRows = List.of(
                new Object[]{100L, 0L, 0L},
                new Object[]{101L, 0L, 0L},
                new Object[]{102L, 0L, 1L}
        );
        when(bookingRepository.findBookingCountsByRideIds(anyList())).thenReturn(countRows);

        Map<String, List<RideSummaryDTO>> separated = rideService.getMyRidesSeparated(driver);

        List<RideSummaryDTO> upcoming = separated.get("upcoming");
        List<RideSummaryDTO> past = separated.get("past");

        // Active ride appears in upcoming
        assertTrue(upcoming.stream().anyMatch(r -> r.getId().equals(100L)));

        // Empty cancelled ride (101) must NOT appear anywhere
        assertFalse(upcoming.stream().anyMatch(r -> r.getId().equals(101L)));
        assertFalse(past.stream().anyMatch(r -> r.getId().equals(101L)));

        // Cancelled ride with bookings (102) must appear in past
        assertTrue(past.stream().anyMatch(r -> r.getId().equals(102L)));
    }

    @Test
    @DisplayName("Scenario 9: Search queries exclude CANCELLED rides")
    void testSearchRides_ExcludesCancelledRides() {
        Ride cancelledRide = new Ride();
        cancelledRide.setId(103L);
        cancelledRide.setStatus("CANCELLED");
        cancelledRide.setAvailableSeats(3);
        cancelledRide.setStartLocation("Pune");
        cancelledRide.setEndLocation("Mumbai");
        cancelledRide.setDate(LocalDate.now().plusDays(1).toString());
        cancelledRide.setTime("10:00");

        when(rideRepository.findByStartLocationContainingIgnoreCaseAndEndLocationContainingIgnoreCase("Pune", "Mumbai"))
                .thenReturn(List.of(activeRide, cancelledRide));

        List<Ride> results = rideService.searchRides("Pune", "Mumbai", null, null, null, null, null, null, null);

        assertEquals(1, results.size());
        assertEquals(100L, results.get(0).getId());
    }

    @Test
    @DisplayName("Scenario 10: Explicit hold release deactivates hold")
    void testReleaseHold_ReleasesPendingOrHeldHold() {
        SeatHold hold = SeatHold.builder()
                .id(401L)
                .ride(activeRide)
                .user(passenger)
                .seatsHeld(1)
                .status(SeatHoldStatus.HELD)
                .razorpayOrderId("order_rel_123")
                .expiresAt(LocalDateTime.now().plusMinutes(5))
                .build();

        when(seatHoldRepository.findByRazorpayOrderId("order_rel_123")).thenReturn(Optional.of(hold));
        when(seatHoldRepository.findByIdForUpdate(401L)).thenReturn(Optional.of(hold));

        boolean released = seatHoldService.releaseHold(401L, "order_rel_123", passenger.getId());

        assertTrue(released);
        assertEquals(SeatHoldStatus.RELEASED, hold.getStatus());
        verify(seatHoldRepository).save(hold);
    }

    @Test
    @DisplayName("Scenario 11: Refund enqueue helper is idempotent")
    void testEnqueueRefund_IsIdempotent() {
        Payment payment = new Payment();
        payment.setId(901L);
        payment.setRazorpayPaymentId("pay_idem_123");
        payment.setAmount(35000L);
        payment.setStatus(Payment.PaymentStatus.SUCCESS);

        when(paymentRepository.save(payment)).thenReturn(payment);

        RefundOutbox existingOutbox = RefundOutbox.builder()
                .id(777L)
                .payment(payment)
                .razorpayPaymentId("pay_idem_123")
                .idempotencyKey("rfnd_op_901_pay_idem_123")
                .status(RefundStatus.PENDING)
                .build();

        when(refundOutboxRepository.findByIdempotencyKey("rfnd_op_901_pay_idem_123"))
                .thenReturn(Optional.of(existingOutbox));

        RefundOutbox result = refundWorkerService.enqueueRefund(payment, "TEST_REASON");

        assertSame(existingOutbox, result);
        verify(refundOutboxRepository, never()).save(any(RefundOutbox.class));
    }
}
