package com.Startup.chalre;

import com.Startup.chalre.DTO.RideDTO;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.model.LatLng;
import com.Startup.chalre.service.MapService;
import com.Startup.chalre.service.RideService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;


import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class ChalreApplicationTests {

    @Autowired
    private MapService mapService;

    @Autowired
    private RideService rideService;

    @Test
    void contextLoads() {
    }

    @Test
    void testGeocodingResolvesValidAddress() {
        LatLng coords = mapService.getCoordinates("Mumbai");
        assertNotNull(coords);
        assertTrue(coords.getLat() > 0.0);
        assertTrue(coords.getLng() > 0.0);
    }

    @Test
    void testGeocodingFailsOnInvalidAddress() {
        LatLng coords = mapService.getCoordinates("invalid_location_xyz_123_random_text");
        assertNull(coords);
    }

    @Test
    void testCreateRideThrowsExceptionOnInvalidCoordinates() {
        RideDTO dto = new RideDTO();
        dto.setStartLocation("invalid_location_xyz_123_random_text");
        dto.setEndLocation("Pune");
        dto.setDate(LocalDate.now().plusDays(1).toString());
        dto.setTime("12:00");
        dto.setAvailableSeats(4);
        dto.setPrice(100.0);

        User mockDriver = new User();

        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            rideService.createRide(dto, mockDriver);
        });

        assertTrue(exception.getMessage().contains("Could not resolve starting or destination coordinates"));
    }

    @Test
    void testCalculateRideEndDateTimeWithValidEndTime() {
        com.Startup.chalre.entity.Ride ride = new com.Startup.chalre.entity.Ride();
        ride.setDate("2026-06-09");
        ride.setTime("09:00");
        ride.setEndTime("11:00");

        java.time.LocalDateTime endDateTime = rideService.calculateRideEndDateTime(ride);
        assertNotNull(endDateTime);
        assertEquals(java.time.LocalDateTime.of(2026, 6, 9, 11, 0), endDateTime);
    }

    @Test
    void testCalculateRideEndDateTimeWithNullEndTimeFallback() {
        com.Startup.chalre.entity.Ride ride = new com.Startup.chalre.entity.Ride();
        ride.setDate("2026-06-09");
        ride.setTime("09:00");
        ride.setEndTime(null);

        java.time.LocalDateTime endDateTime = rideService.calculateRideEndDateTime(ride);
        assertNotNull(endDateTime);
        assertEquals(java.time.LocalDateTime.of(2026, 6, 9, 11, 0), endDateTime);
    }

    @Test
    void testCalculateRideEndDateTimeWithInvalidEndTimeFallback() {
        com.Startup.chalre.entity.Ride ride = new com.Startup.chalre.entity.Ride();
        ride.setDate("2026-06-09");
        ride.setTime("09:00");
        ride.setEndTime("invalid_time");

        java.time.LocalDateTime endDateTime = rideService.calculateRideEndDateTime(ride);
        assertNotNull(endDateTime);
        assertEquals(java.time.LocalDateTime.of(2026, 6, 9, 11, 0), endDateTime);
    }

    @Test
    void testCalculateRideEndDateTimeWithMidnightCrossing() {
        com.Startup.chalre.entity.Ride ride = new com.Startup.chalre.entity.Ride();
        ride.setDate("2026-06-09");
        ride.setTime("22:00");
        ride.setEndTime("02:00");

        java.time.LocalDateTime endDateTime = rideService.calculateRideEndDateTime(ride);
        assertNotNull(endDateTime);
        assertEquals(java.time.LocalDateTime.of(2026, 6, 10, 2, 0), endDateTime);
    }

    @Test
    void testExpiryVisibilityThreshold() {
        com.Startup.chalre.entity.Ride activeRide = new com.Startup.chalre.entity.Ride();
        activeRide.setDate(LocalDate.now(java.time.ZoneId.of("Asia/Kolkata")).toString());
        java.time.LocalTime departure = java.time.LocalTime.now(java.time.ZoneId.of("Asia/Kolkata")).minusHours(2).minusMinutes(10);
        java.time.LocalTime end = departure.plusHours(2);
        
        activeRide.setTime(departure.format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")));
        activeRide.setEndTime(end.format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")));
        
        java.time.LocalDateTime currentIstTime = java.time.LocalDateTime.now(java.time.ZoneId.of("Asia/Kolkata"));
        java.time.LocalDateTime expiryDateTime = rideService.calculateRideEndDateTime(activeRide).plusMinutes(30);
        
        assertFalse(currentIstTime.isAfter(expiryDateTime));

        com.Startup.chalre.entity.Ride expiredRide = new com.Startup.chalre.entity.Ride();
        expiredRide.setDate(LocalDate.now(java.time.ZoneId.of("Asia/Kolkata")).toString());
        java.time.LocalTime departureExpired = java.time.LocalTime.now(java.time.ZoneId.of("Asia/Kolkata")).minusHours(2).minusMinutes(40);
        java.time.LocalTime endExpired = departureExpired.plusHours(2);
        
        expiredRide.setTime(departureExpired.format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")));
        expiredRide.setEndTime(endExpired.format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")));
        
        java.time.LocalDateTime expiryDateTimeExpired = rideService.calculateRideEndDateTime(expiredRide).plusMinutes(30);
        
        assertTrue(currentIstTime.isAfter(expiryDateTimeExpired));
    }
}


