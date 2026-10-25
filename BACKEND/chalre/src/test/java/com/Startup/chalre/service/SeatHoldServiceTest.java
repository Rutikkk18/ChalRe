package com.Startup.chalre.service;

import com.Startup.chalre.DTO.BookingDTO;
import com.Startup.chalre.DTO.RideUpdateDTO;
import com.Startup.chalre.Exception.SeatUnavailableException;
import com.Startup.chalre.entity.*;
import com.Startup.chalre.repository.*;
import com.razorpay.Order;
import com.razorpay.OrderClient;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import org.json.JSONObject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
public class SeatHoldServiceTest {

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
    private NotificationService notificationService;
    @Mock
    private PaymentRepository paymentRepository;

    private SeatHoldService seatHoldService;
    private BookingService bookingService;

    private User driver;
    private User passengerA;
    private User passengerB;
    private Ride singleSeatRide;

    @BeforeEach
    void setUp() {
        seatHoldService = new SeatHoldService(
                rideRepository,
                userRepository,
                seatHoldRepository,
                razorpayClient,
                rideService
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

        singleSeatRide = new Ride();
        singleSeatRide.setId(100L);
        singleSeatRide.setDriver(driver);
        singleSeatRide.setAvailableSeats(1);
        singleSeatRide.setDate(LocalDate.now().plusDays(1).toString());
        singleSeatRide.setTime("14:00");
        singleSeatRide.setPrice(350.0);
        singleSeatRide.setStartLocation("Pune");
        singleSeatRide.setEndLocation("Mumbai");

        when(rideRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(singleSeatRide));
        when(userRepository.findById(2L)).thenReturn(Optional.of(passengerA));
        when(userRepository.findById(3L)).thenReturn(Optional.of(passengerB));

        when(rideService.calculatePrice(eq(100L), any(), any(), any(), any()))
                .thenReturn(Map.of("calculatedPrice", 350.0));
    }

    @Test
    void testReserveHold_SuccessfulWhenCapacityAvailable() {
        when(seatHoldRepository.sumActiveHeldSeats(eq(100L), anyCollection(), any(), isNull()))
                .thenReturn(0);

        when(seatHoldRepository.save(any(SeatHold.class))).thenAnswer(invocation -> {
            SeatHold hold = invocation.getArgument(0);
            hold.setId(501L);
            return hold;
        });

        SeatHoldService.ReservationResult result = seatHoldService.reserveHold(
                100L, 1, 2L, 35000L, null, null, null, null);

        assertNotNull(result);
        assertEquals(501L, result.getHoldId());
        assertTrue(result.getHoldReference().startsWith("hld_"));
        assertTrue(result.getReceipt().startsWith("rcpt_501_"));
        assertEquals(35000L, result.getVerifiedAmountPaise());
    }

    @Test
    void testTwoUsersCompetingForLastSeat_SecondRejectedWithSeatUnavailableException() {
        // User A takes the only seat
        when(seatHoldRepository.sumActiveHeldSeats(eq(100L), anyCollection(), any(), isNull()))
                .thenReturn(0);

        when(seatHoldRepository.save(any(SeatHold.class))).thenAnswer(invocation -> {
            SeatHold hold = invocation.getArgument(0);
            hold.setId(501L);
            return hold;
        });

        SeatHoldService.ReservationResult resultA = seatHoldService.reserveHold(
                100L, 1, 2L, 35000L, null, null, null, null);
        assertNotNull(resultA);

        // Now active holds = 1 seat, unreservedCapacity = 1 - 1 = 0
        when(seatHoldRepository.sumActiveHeldSeats(eq(100L), anyCollection(), any(), isNull()))
                .thenReturn(1);

        assertThrows(SeatUnavailableException.class, () -> {
            seatHoldService.reserveHold(100L, 1, 3L, 35000L, null, null, null, null);
        });
    }

    @Test
    void testActiveHoldsConsumeCapacity_CashBookingIsBlocked() {
        // Active hold exists on the single seat
        when(seatHoldRepository.sumActiveHeldSeats(eq(100L), anyCollection(), any(), isNull()))
                .thenReturn(1);

        BookingDTO cashDto = new BookingDTO();
        cashDto.setRideId(100L);
        cashDto.setSeats(1);
        cashDto.setPaymentMethod("CASH");

        assertThrows(SeatUnavailableException.class, () -> {
            bookingService.bookRide(cashDto, passengerB);
        });
    }

    @Test
    void testAttachOrder_TransitionsStatusToHeldWith5MinExpiry() {
        SeatHold pendingHold = SeatHold.builder()
                .id(501L)
                .ride(singleSeatRide)
                .user(passengerA)
                .seatsHeld(1)
                .holdReference("hld_test123")
                .status(SeatHoldStatus.PENDING_ORDER)
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusSeconds(90))
                .build();

        when(seatHoldRepository.findByIdForUpdate(501L)).thenReturn(Optional.of(pendingHold));
        when(seatHoldRepository.save(any(SeatHold.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SeatHold held = seatHoldService.attachOrder(501L, "order_rzp123456");

        assertEquals(SeatHoldStatus.HELD, held.getStatus());
        assertEquals("order_rzp123456", held.getRazorpayOrderId());
        assertTrue(held.getExpiresAt().isAfter(LocalDateTime.now().plusMinutes(4)));
    }

    @Test
    void testAttachOrder_RejectsIfHoldAlreadyExpired() {
        SeatHold expiredHold = SeatHold.builder()
                .id(501L)
                .ride(singleSeatRide)
                .user(passengerA)
                .seatsHeld(1)
                .holdReference("hld_test123")
                .status(SeatHoldStatus.PENDING_ORDER)
                .createdAt(LocalDateTime.now().minusMinutes(2))
                .expiresAt(LocalDateTime.now().minusSeconds(10)) // Expired!
                .build();

        when(seatHoldRepository.findByIdForUpdate(501L)).thenReturn(Optional.of(expiredHold));

        assertThrows(IllegalStateException.class, () -> {
            seatHoldService.attachOrder(501L, "order_rzp123456");
        });
    }

    @Test
    void testLegacyMutator_UpdateRideBlockedWhenReducingBelowActiveHolds() {
        Ride multiSeatRide = new Ride();
        multiSeatRide.setId(200L);
        multiSeatRide.setDriver(driver);
        multiSeatRide.setAvailableSeats(4);
        multiSeatRide.setDate(LocalDate.now().plusDays(2).toString());

        when(rideRepository.findByIdForUpdate(200L)).thenReturn(Optional.of(multiSeatRide));
        // 2 active holds on this ride
        when(seatHoldRepository.sumActiveHeldSeats(eq(200L), anyCollection(), any(), isNull()))
                .thenReturn(2);

        RideService rideServiceToTest = new RideService(
                rideRepository,
                notificationService,
                bookingRepository,
                mock(MapService.class),
                mock(RouteService.class),
                paymentRepository,
                seatHoldRepository
        );

        RideUpdateDTO updateDTO = new RideUpdateDTO();
        updateDTO.setAvailableSeats(1); // Driver tries to reduce to 1, but 2 are on hold!

        assertThrows(RuntimeException.class, () -> {
            rideServiceToTest.updateRide(200L, updateDTO, driver);
        });
    }

    @Test
    void testLegacyMutator_CancelBookingRestoresSeatsUnderLock() {
        Booking booking = new Booking();
        booking.setId(777L);
        booking.setUser(passengerA);
        booking.setRide(singleSeatRide);
        booking.setSeatsBooked(1);
        booking.setStatus("BOOKED");
        booking.setPaymentStatus("PENDING");

        when(bookingRepository.findById(777L)).thenReturn(Optional.of(booking));
        when(rideRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(singleSeatRide));

        assertEquals(1, singleSeatRide.getAvailableSeats());

        bookingService.cancelBooking(777L, passengerA);

        assertEquals("CANCELLED", booking.getStatus());
        assertEquals(2, singleSeatRide.getAvailableSeats()); // 1 original + 1 cancelled restored
        verify(rideRepository).findByIdForUpdate(100L); // Verified row lock was acquired
        verify(rideRepository).save(singleSeatRide);
    }
}
