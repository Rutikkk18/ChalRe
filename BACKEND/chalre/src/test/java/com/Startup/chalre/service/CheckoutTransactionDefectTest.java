package com.Startup.chalre.service;

import com.Startup.chalre.DTO.PaymentFinalizationCommand;
import com.Startup.chalre.DTO.PaymentFinalizationResult;
import com.Startup.chalre.Exception.SeatUnavailableException;
import com.Startup.chalre.controller.PaymentController;
import com.Startup.chalre.entity.*;
import com.Startup.chalre.repository.*;
import com.razorpay.Order;
import com.razorpay.OrderClient;
import com.razorpay.RazorpayClient;
import org.json.JSONObject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionException;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class CheckoutTransactionDefectTest {

    @Mock
    private RideRepository rideRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private SeatHoldRepository seatHoldRepository;
    @Mock
    private RazorpayClient razorpayClient;
    @Mock
    private RideService rideService;
    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private RefundOutboxRepository refundOutboxRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private RazorpayPaymentService razorpayPaymentService;
    @Mock
    private BookingService bookingService;

    private PlatformTransactionManager trackingTransactionManager;
    private TransactionTemplate trackingTransactionTemplate;
    private AtomicInteger txBeginCount;
    private AtomicInteger txCommitCount;

    private SeatHoldService seatHoldService;
    private PaymentFinalizationService paymentFinalizationService;
    private PaymentController paymentController;

    private User driver;
    private User passenger;
    private Ride ride;

    @BeforeEach
    void setUp() {
        txBeginCount = new AtomicInteger(0);
        txCommitCount = new AtomicInteger(0);

        // Tracking transaction manager that records transaction boundaries
        trackingTransactionManager = new PlatformTransactionManager() {
            @Override
            public TransactionStatus getTransaction(TransactionDefinition definition) throws TransactionException {
                txBeginCount.incrementAndGet();
                return new SimpleTransactionStatus();
            }

            @Override
            public void commit(TransactionStatus status) throws TransactionException {
                txCommitCount.incrementAndGet();
            }

            @Override
            public void rollback(TransactionStatus status) throws TransactionException {
            }
        };

        trackingTransactionTemplate = new TransactionTemplate(trackingTransactionManager);

        seatHoldService = new SeatHoldService(
                rideRepository,
                userRepository,
                seatHoldRepository,
                razorpayClient,
                rideService,
                trackingTransactionTemplate
        );

        paymentFinalizationService = new PaymentFinalizationService(
                rideRepository,
                bookingRepository,
                paymentRepository,
                seatHoldRepository,
                refundOutboxRepository,
                userRepository,
                notificationService,
                "test_secret_12345",
                razorpayClient,
                trackingTransactionTemplate
        );

        paymentController = new PaymentController(
                razorpayPaymentService,
                bookingService,
                paymentFinalizationService,
                seatHoldService,
                "rzp_test_key123"
        );

        driver = new User();
        driver.setId(1L);
        driver.setName("Driver");

        passenger = new User();
        passenger.setId(2L);
        passenger.setName("Passenger");

        ride = new Ride();
        ride.setId(100L);
        ride.setDriver(driver);
        ride.setAvailableSeats(2);
        ride.setPrice(350.0);
        ride.setDistance(150.0);
        ride.setDate(LocalDate.now().plusDays(1).toString());
        ride.setTime("10:00");
        ride.setEndTime("13:00");
    }

    @Test
    @DisplayName("1. Phase A and Phase B must execute in two separate Spring transactions via TransactionTemplate")
    void testTwoPhaseCheckout_ExecutesInTwoSeparateTransactions() throws Exception {
        when(rideRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(ride));
        when(userRepository.findById(2L)).thenReturn(Optional.of(passenger));
        when(seatHoldRepository.sumActiveHeldSeats(eq(100L), any(), any(), any())).thenReturn(0);
        when(rideService.calculatePrice(eq(100L), any(), any(), any(), any()))
                .thenReturn(Map.of("calculatedPrice", 350.0));

        SeatHold savedHold = SeatHold.builder()
                .id(501L)
                .ride(ride)
                .user(passenger)
                .seatsHeld(1)
                .holdReference("hld_test123")
                .status(SeatHoldStatus.PENDING_ORDER)
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusSeconds(90))
                .build();
        when(seatHoldRepository.save(any(SeatHold.class))).thenReturn(savedHold);
        when(seatHoldRepository.findByIdForUpdate(501L)).thenReturn(Optional.of(savedHold));

        // Mock Razorpay order client
        OrderClient mockOrders = mock(OrderClient.class);
        razorpayClient.orders = mockOrders;
        Order mockOrder = mock(Order.class);
        when(mockOrder.get("id")).thenReturn("order_rzp_phaseB");
        when(mockOrders.create(any(JSONObject.class))).thenAnswer(invocation -> {
            // Assert that Phase A transaction has already committed BEFORE orders.create runs!
            assertEquals(1, txBeginCount.get(), "Phase A transaction must have started");
            assertEquals(1, txCommitCount.get(), "Phase A transaction must have committed before gateway call");
            return mockOrder;
        });

        Map<String, Object> response = seatHoldService.createOrderAndHold(
                2L, 100L, 35000L, 1, 18.5, 73.8, 19.0, 72.8);

        assertNotNull(response);
        assertEquals("order_rzp_phaseB", response.get("orderId"));
        assertEquals(501L, response.get("holdId"));

        // Both Phase A and Phase B transactions must have completed
        assertEquals(2, txBeginCount.get(), "Total transactions started must be 2 (Phase A and Phase B)");
        assertEquals(2, txCommitCount.get(), "Total transactions committed must be 2 (Phase A and Phase B)");
    }

    @Test
    @DisplayName("2. If Phase B fails after Razorpay order was created, hold must NOT be marked FAILED; must preserve order and mark EXPIRED_UNRECONCILED")
    void testPhaseBFailure_PreservesHoldAsExpiredUnreconciled() throws Exception {
        when(rideRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(ride));
        when(userRepository.findById(2L)).thenReturn(Optional.of(passenger));
        when(seatHoldRepository.sumActiveHeldSeats(eq(100L), any(), any(), any())).thenReturn(0);
        when(rideService.calculatePrice(eq(100L), any(), any(), any(), any()))
                .thenReturn(Map.of("calculatedPrice", 350.0));

        SeatHold savedHold = SeatHold.builder()
                .id(502L)
                .ride(ride)
                .user(passenger)
                .seatsHeld(1)
                .holdReference("hld_phaseB_fail")
                .status(SeatHoldStatus.PENDING_ORDER)
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusSeconds(90))
                .build();
        when(seatHoldRepository.save(any(SeatHold.class))).thenReturn(savedHold);

        // In Phase B, findByIdForUpdate throws a transient DB exception on first call, then succeeds on recovery call
        when(seatHoldRepository.findByIdForUpdate(502L))
                .thenThrow(new RuntimeException("DB Connection timeout during Phase B attachOrder"))
                .thenReturn(Optional.of(savedHold));

        OrderClient mockOrders = mock(OrderClient.class);
        razorpayClient.orders = mockOrders;
        Order mockOrder = mock(Order.class);
        when(mockOrder.get("id")).thenReturn("order_rzp_orphan");
        when(mockOrders.create(any(JSONObject.class))).thenReturn(mockOrder);

        assertThrows(RuntimeException.class, () -> seatHoldService.createOrderAndHold(
                2L, 100L, 35000L, 1, 18.5, 73.8, 19.0, 72.8));

        // Verify markHoldFailed was NEVER called (capacity must NOT be freed)
        verify(seatHoldRepository, never()).save(argThat(h ->
                SeatHoldStatus.FAILED.equals(h.getStatus())
        ));

        // When DB recovers in preserveUnreconciledHold, the hold receives the orderId and EXPIRED_UNRECONCILED
        seatHoldService.preserveUnreconciledHold(502L, "order_rzp_orphan", "DB timeout");

        assertEquals(SeatHoldStatus.EXPIRED_UNRECONCILED, savedHold.getStatus());
        assertEquals("order_rzp_orphan", savedHold.getRazorpayOrderId());
    }

    @Test
    @DisplayName("3. RideService.calculatePrice must use findById (no lock, no transaction required)")
    void testRideService_CalculatePrice_UsesFindByIdWithoutLock() {
        RideService realRideService = new RideService(
                rideRepository,
                notificationService,
                bookingRepository,
                mock(MapService.class),
                mock(RouteService.class),
                paymentRepository,
                seatHoldRepository
        );

        when(rideRepository.findById(100L)).thenReturn(Optional.of(ride));

        Map<String, Object> price = realRideService.calculatePrice(100L, 18.5, 73.8, 19.0, 72.8);

        assertNotNull(price);
        assertEquals(350.0, price.get("fullPrice"));

        // Verify findById was called, NOT findByIdForUpdate
        verify(rideRepository, times(1)).findById(100L);
        verify(rideRepository, never()).findByIdForUpdate(100L);
    }

    @Test
    @DisplayName("4. RideService.getRideBookings must use findById (no lock, read-only query)")
    void testRideService_GetRideBookings_UsesFindByIdWithoutLock() {
        RideService realRideService = new RideService(
                rideRepository,
                notificationService,
                bookingRepository,
                mock(MapService.class),
                mock(RouteService.class),
                paymentRepository,
                seatHoldRepository
        );

        when(rideRepository.findById(100L)).thenReturn(Optional.of(ride));
        when(bookingRepository.findByRide(ride)).thenReturn(Collections.emptyList());

        Map<String, Object> bookings = realRideService.getRideBookings(100L, driver);

        assertNotNull(bookings);
        verify(rideRepository, times(1)).findById(100L);
        verify(rideRepository, never()).findByIdForUpdate(100L);
    }

    @Test
    @DisplayName("5. PaymentController.createOrder returns HTTP 409 on SeatUnavailableException")
    void testPaymentController_SeatUnavailable_Returns409() {
        when(razorpayPaymentService.createOrder(any(), any(), any(), any(), any(), any(), any(), any()))
                .thenThrow(new SeatUnavailableException("Seat currently held"));

        Map<String, Object> body = Map.of(
                "rideId", 100,
                "amount", 35000,
                "seats", 1
        );

        ResponseEntity<?> response = paymentController.createOrder(body, passenger);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertTrue(response.getBody() instanceof Map);
        Map<?, ?> responseBody = (Map<?, ?>) response.getBody();
        assertEquals("SEAT_CURRENTLY_HELD", responseBody.get("error"));
    }

    @Test
    @DisplayName("6. PaymentController.createOrder returns HTTP 400 on IllegalArgumentException")
    void testPaymentController_BadRequest_Returns400() {
        when(razorpayPaymentService.createOrder(any(), any(), any(), any(), any(), any(), any(), any()))
                .thenThrow(new IllegalArgumentException("Invalid seats count: 0"));

        Map<String, Object> body = Map.of(
                "rideId", 100,
                "amount", 35000,
                "seats", 0
        );

        ResponseEntity<?> response = paymentController.createOrder(body, passenger);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody() instanceof Map);
        Map<?, ?> responseBody = (Map<?, ?>) response.getBody();
        assertEquals("BAD_REQUEST", responseBody.get("error"));
    }

    @Test
    @DisplayName("7. PaymentController.createOrder returns HTTP 500 with sanitized message on unexpected system exception")
    void testPaymentController_UnexpectedSystemError_Returns500Sanitized() {
        when(razorpayPaymentService.createOrder(any(), any(), any(), any(), any(), any(), any(), any()))
                .thenThrow(new RuntimeException("Query requires transaction be in progress, but no transaction is known to be in progress"));

        Map<String, Object> body = Map.of(
                "rideId", 100,
                "amount", 35000,
                "seats", 1
        );

        ResponseEntity<?> response = paymentController.createOrder(body, passenger);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertTrue(response.getBody() instanceof Map);
        Map<?, ?> responseBody = (Map<?, ?>) response.getBody();
        assertEquals("CHECKOUT_INITIATION_FAILED", responseBody.get("error"));
        assertEquals("Unable to initiate checkout. Please try again.", responseBody.get("message"));
        // Ensure raw Hibernate internal query exception is NOT leaked to client!
        assertFalse(responseBody.get("message").toString().contains("Query requires transaction"));
    }

    @Test
    @DisplayName("8. PaymentFinalizationService executes atomic finalization via TransactionTemplate")
    void testPaymentFinalizationService_UsesTransactionTemplate() {
        PaymentFinalizationCommand cmd = PaymentFinalizationCommand.builder()
                .rideId(100L)
                .userId(passenger.getId())
                .amountPaise(35000L)
                .seats(1)
                .razorpayOrderId("order_final_1")
                .razorpayPaymentId("pay_final_1")
                .razorpaySignature("sig_dummy")
                .signaturePreVerified(true) // skip signature HMAC
                .build();

        when(rideRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(ride));
        when(seatHoldRepository.findByRazorpayOrderId("order_final_1")).thenReturn(Optional.of(
                SeatHold.builder()
                        .id(701L)
                        .ride(ride)
                        .user(passenger)
                        .seatsHeld(1)
                        .status(SeatHoldStatus.HELD)
                        .expiresAt(LocalDateTime.now().plusMinutes(5))
                        .build()
        ));
        when(seatHoldRepository.findByIdForUpdate(701L)).thenReturn(Optional.of(
                SeatHold.builder()
                        .id(701L)
                        .ride(ride)
                        .user(passenger)
                        .seatsHeld(1)
                        .status(SeatHoldStatus.HELD)
                        .expiresAt(LocalDateTime.now().plusMinutes(5))
                        .build()
        ));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> {
            Booking b = inv.getArgument(0);
            b.setId(901L);
            return b;
        });
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            p.setId(801L);
            return p;
        });

        PaymentFinalizationResult result = paymentFinalizationService.finalizePaymentAndBooking(cmd, passenger);

        assertTrue(result.isSuccess());
        // Verify transaction template began and committed atomic finalization
        assertTrue(txBeginCount.get() >= 1, "TransactionTemplate must have started transaction for finalization");
        assertTrue(txCommitCount.get() >= 1, "TransactionTemplate must have committed transaction for finalization");
    }
}
