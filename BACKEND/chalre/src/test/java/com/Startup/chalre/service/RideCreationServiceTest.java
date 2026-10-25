package com.Startup.chalre.service;

import com.Startup.chalre.DTO.RideDTO;
import com.Startup.chalre.model.RouteResponse;
import com.Startup.chalre.entity.Ride;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.model.LatLng;
import com.Startup.chalre.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class RideCreationServiceTest {

    @Mock
    private RideRepository rideRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private MapService mapService;
    @Mock
    private RouteService routeService;
    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private SeatHoldRepository seatHoldRepository;

    private RideService rideService;
    private User driver;

    @BeforeEach
    void setUp() {
        rideService = new RideService(
                rideRepository,
                notificationService,
                bookingRepository,
                mapService,
                routeService,
                paymentRepository,
                seatHoldRepository
        );

        driver = new User();
        driver.setId(1L);
        driver.setName("Test Driver");
        driver.setEmail("driver@chalre.in");
    }

    @Test
    void testCreateRideSuccessWithCoordinatesAndPolyline() {
        RideDTO dto = new RideDTO();
        dto.setStartLocation("Pune Station");
        dto.setEndLocation("Mumbai Airport");
        dto.setDate(LocalDate.now(java.time.ZoneId.of("Asia/Kolkata")).plusDays(2).toString());
        dto.setTime("10:00");
        dto.setAvailableSeats(3);
        dto.setPrice(350.0);
        dto.setFromLat(18.5284);
        dto.setFromLng(73.8739);
        dto.setToLat(19.0896);
        dto.setToLng(72.8656);

        String samplePolyline = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";
        when(routeService.getRoute(anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(new RouteResponse(150.0, 10800.0, samplePolyline, false));

        when(rideRepository.save(any(Ride.class))).thenAnswer(invocation -> {
            Ride r = invocation.getArgument(0);
            r.setId(101L);
            return r;
        });

        Ride created = rideService.createRide(dto, driver);

        assertNotNull(created);
        assertEquals(101L, created.getId());
        assertEquals("Pune Station", created.getStartLocation());
        assertEquals("Mumbai Airport", created.getEndLocation());
        assertEquals(3, created.getAvailableSeats());
        assertEquals(350.0, created.getPrice());
        assertEquals("ACTIVE", created.getStatus());
        assertEquals(driver, created.getDriver());

        // Verify spatial fields
        assertNotNull(created.getPolyline());
        assertNotNull(created.getRoute(), "JTS LineString route should be generated from polyline");
        assertEquals(4326, created.getRoute().getSRID(), "SRID must be 4326 (WGS84)");
        assertTrue(created.getRoute().getNumPoints() >= 2);

        // Verify notification was sent
        verify(notificationService).sendNotification(
                eq(driver),
                eq("Ride Created"),
                anyString(),
                eq("RIDE_CREATED"),
                any()
        );
    }

    @Test
    void testCreateRideSuccessWithPreselectedPreviewRoute() {
        RideDTO dto = new RideDTO();
        dto.setStartLocation("Swargate, Pune");
        dto.setEndLocation("Thane");
        dto.setDate(LocalDate.now(java.time.ZoneId.of("Asia/Kolkata")).plusDays(1).toString());
        dto.setTime("08:30");
        dto.setAvailableSeats(2);
        dto.setPrice(400.0);
        dto.setFromLat(18.5018);
        dto.setFromLng(73.8636);
        dto.setToLat(19.2183);
        dto.setToLng(72.9781);
        dto.setSelectedPolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
        dto.setSelectedDistance(140.0);
        dto.setSelectedDuration(150.0);

        when(rideRepository.save(any(Ride.class))).thenAnswer(inv -> {
            Ride r = inv.getArgument(0);
            r.setId(102L);
            return r;
        });

        Ride created = rideService.createRide(dto, driver);

        assertNotNull(created);
        assertEquals(102L, created.getId());
        assertEquals(140.0, created.getDistance());
        verify(routeService, never()).getRoute(anyDouble(), anyDouble(), anyDouble(), anyDouble());
    }

    @Test
    void testCreateRideRejectsPastDate() {
        RideDTO dto = new RideDTO();
        dto.setStartLocation("Pune");
        dto.setEndLocation("Mumbai");
        dto.setDate(LocalDate.now(java.time.ZoneId.of("Asia/Kolkata")).minusDays(1).toString());
        dto.setTime("12:00");
        dto.setAvailableSeats(2);
        dto.setPrice(200.0);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> rideService.createRide(dto, driver));
        assertEquals("Cannot create a ride in the past", ex.getMessage());
        verify(rideRepository, never()).save(any());
    }

    @Test
    void testCreateRideRejectsPastTimeToday() {
        RideDTO dto = new RideDTO();
        dto.setStartLocation("Pune");
        dto.setEndLocation("Mumbai");
        LocalDate today = LocalDate.now(java.time.ZoneId.of("Asia/Kolkata"));
        dto.setDate(today.toString());
        LocalTime pastTime = LocalTime.now(java.time.ZoneId.of("Asia/Kolkata")).minusHours(2);
        dto.setTime(String.format("%02d:%02d", pastTime.getHour(), pastTime.getMinute()));
        dto.setAvailableSeats(2);
        dto.setPrice(200.0);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> rideService.createRide(dto, driver));
        assertEquals("Cannot create a ride with past time for today", ex.getMessage());
        verify(rideRepository, never()).save(any());
    }

    @Test
    void testCreateRideThrowsExceptionWhenCoordinatesCannotBeResolved() {
        RideDTO dto = new RideDTO();
        dto.setStartLocation("Nowhere Unknown 123");
        dto.setEndLocation("Nowhere Unknown 456");
        dto.setDate(LocalDate.now(java.time.ZoneId.of("Asia/Kolkata")).plusDays(3).toString());
        dto.setTime("14:00");
        dto.setAvailableSeats(1);
        dto.setPrice(150.0);

        when(mapService.getCoordinates("Nowhere Unknown 123")).thenReturn(null);
        when(mapService.getCoordinates("Nowhere Unknown 456")).thenReturn(null);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> rideService.createRide(dto, driver));
        assertTrue(ex.getMessage().contains("Could not resolve starting or destination coordinates"));
        verify(rideRepository, never()).save(any());
    }
}
