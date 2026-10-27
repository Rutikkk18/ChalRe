package com.Startup.chalre.service;

import com.Startup.chalre.DTO.PaymentFinalizationCommand;
import com.Startup.chalre.DTO.PaymentFinalizationResult;
import com.Startup.chalre.entity.Ride;
import com.Startup.chalre.entity.SeatHold;
import com.Startup.chalre.entity.SeatHoldStatus;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.repository.SeatHoldRepository;
import com.razorpay.Order;
import com.razorpay.OrderClient;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
public class SeatHoldSweeperServiceTest {

    @Mock
    private SeatHoldRepository seatHoldRepository;
    @Mock
    private PaymentFinalizationService paymentFinalizationService;
    @Mock
    private RazorpayClient razorpayClient;
    @Mock
    private OrderClient orderClient;

    private SeatHoldSweeperService sweeperService;

    private Ride ride;
    private User passenger;
    private SeatHold hold;

    @BeforeEach
    void setUp() throws Exception {
        sweeperService = new SeatHoldSweeperService(
                seatHoldRepository,
                paymentFinalizationService,
                razorpayClient
        );

        // Inject orderClient into razorpayClient.orders
        razorpayClient.orders = orderClient;

        passenger = new User();
        passenger.setId(10L);
        passenger.setName("Dave");

        ride = new Ride();
        ride.setId(100L);
        ride.setAvailableSeats(1);

        hold = SeatHold.builder()
                .id(1L)
                .ride(ride)
                .user(passenger)
                .seatsHeld(1)
                .status(SeatHoldStatus.HELD)
                .razorpayOrderId("order_sweep_123")
                .expiresAt(LocalDateTime.now().minusMinutes(2))
                .createdAt(LocalDateTime.now().minusMinutes(7))
                .build();

        when(seatHoldRepository.findById(1L)).thenReturn(Optional.of(hold));
    }

    @Test
    @DisplayName("1. Abandoned PENDING_ORDER without order ID is expired safely")
    void testAbandonedPendingOrder_ExpiredSafely() {
        hold.setStatus(SeatHoldStatus.PENDING_ORDER);
        hold.setRazorpayOrderId(null);

        when(seatHoldRepository.findExpiredHoldsForSweeper(any(), any(), any(), any()))
                .thenReturn(List.of(hold));

        sweeperService.sweepExpiredHolds();

        assertEquals(SeatHoldStatus.EXPIRED, hold.getStatus());
        assertNotNull(hold.getLastReconciledAt());
        verify(seatHoldRepository, times(1)).save(hold);
    }

    @Test
    @DisplayName("2. Expired hold with confirmed unpaid order is expired safely and releases capacity")
    void testExpiredHold_UnpaidOrder_ExpiredSafely() throws Exception {
        when(seatHoldRepository.findExpiredHoldsForSweeper(any(), any(), any(), any()))
                .thenReturn(List.of(hold));

        Order rzpOrder = mock(Order.class);
        when(rzpOrder.has("status")).thenReturn(true);
        when(rzpOrder.get("status")).thenReturn("created");
        when(rzpOrder.has("amount_paid")).thenReturn(true);
        when(rzpOrder.get("amount_paid")).thenReturn(0L);

        when(orderClient.fetch("order_sweep_123")).thenReturn(rzpOrder);
        when(orderClient.fetchPayments("order_sweep_123")).thenReturn(List.of());

        sweeperService.sweepExpiredHolds();

        assertEquals(SeatHoldStatus.EXPIRED, hold.getStatus());
        verify(seatHoldRepository, times(1)).save(hold);
        verify(paymentFinalizationService, never()).finalizePaymentAndBooking(any(), any());
    }

    @Test
    @DisplayName("3. Expired hold with late payment triggers authoritative payment finalization")
    void testExpiredHold_LatePaymentReconciled() throws Exception {
        when(seatHoldRepository.findExpiredHoldsForSweeper(any(), any(), any(), any()))
                .thenReturn(List.of(hold));

        Order rzpOrder = mock(Order.class);
        when(rzpOrder.has("status")).thenReturn(true);
        when(rzpOrder.get("status")).thenReturn("paid");
        when(rzpOrder.has("amount_paid")).thenReturn(true);
        when(rzpOrder.get("amount_paid")).thenReturn(40000L);

        com.razorpay.Payment capturedPayment = mock(com.razorpay.Payment.class);
        when(capturedPayment.has("status")).thenReturn(true);
        when(capturedPayment.get("status")).thenReturn("captured");
        when(capturedPayment.get("id")).thenReturn("pay_late_999");
        when(capturedPayment.get("amount")).thenReturn(40000L);

        when(orderClient.fetch("order_sweep_123")).thenReturn(rzpOrder);
        when(orderClient.fetchPayments("order_sweep_123")).thenReturn(List.of(capturedPayment));

        when(paymentFinalizationService.finalizePaymentAndBooking(any(PaymentFinalizationCommand.class), isNull()))
                .thenReturn(PaymentFinalizationResult.builder().success(true).status("SUCCESS").build());

        sweeperService.sweepExpiredHolds();

        // Must finalize payment via PaymentFinalizationService
        ArgumentCaptor<PaymentFinalizationCommand> cmdCaptor = ArgumentCaptor.forClass(PaymentFinalizationCommand.class);
        verify(paymentFinalizationService, times(1)).finalizePaymentAndBooking(cmdCaptor.capture(), isNull());
        PaymentFinalizationCommand cmd = cmdCaptor.getValue();
        assertEquals("pay_late_999", cmd.getRazorpayPaymentId());
        assertEquals("order_sweep_123", cmd.getRazorpayOrderId());
        assertEquals(40000L, cmd.getAmountPaise());
        assertTrue(cmd.isSignaturePreVerified());
    }

    @Test
    @DisplayName("4. Gateway unreachable during reconciliation protects capacity as EXPIRED_UNRECONCILED")
    void testGatewayUnreachable_ProtectsCapacityAsExpiredUnreconciled() throws Exception {
        when(seatHoldRepository.findExpiredHoldsForSweeper(any(), any(), any(), any()))
                .thenReturn(List.of(hold));

        when(orderClient.fetch("order_sweep_123"))
                .thenThrow(new RazorpayException("Connection timed out to razorpay.com"));

        sweeperService.sweepExpiredHolds();

        // Must NOT release capacity! Must be marked EXPIRED_UNRECONCILED
        assertEquals(SeatHoldStatus.EXPIRED_UNRECONCILED, hold.getStatus());
        verify(seatHoldRepository, times(1)).save(hold);
    }

    @Test
    @DisplayName("5. In-flight payment authorization defers expiry to prevent capacity loss during checkout")
    void testInFlightPayment_DefersExpiry() throws Exception {
        when(seatHoldRepository.findExpiredHoldsForSweeper(any(), any(), any(), any()))
                .thenReturn(List.of(hold));

        Order rzpOrder = mock(Order.class);
        when(rzpOrder.has("status")).thenReturn(true);
        when(rzpOrder.get("status")).thenReturn("attempted");
        when(rzpOrder.has("amount_paid")).thenReturn(true);
        when(rzpOrder.get("amount_paid")).thenReturn(0L);

        com.razorpay.Payment authPayment = mock(com.razorpay.Payment.class);
        when(authPayment.has("status")).thenReturn(true);
        when(authPayment.get("status")).thenReturn("authorized"); // Still pending capture/settlement

        when(orderClient.fetch("order_sweep_123")).thenReturn(rzpOrder);
        when(orderClient.fetchPayments("order_sweep_123")).thenReturn(List.of(authPayment));

        sweeperService.sweepExpiredHolds();

        assertEquals(SeatHoldStatus.EXPIRED_UNRECONCILED, hold.getStatus());
        verify(seatHoldRepository, times(1)).save(hold);
        verify(paymentFinalizationService, never()).finalizePaymentAndBooking(any(), any());
    }
}
