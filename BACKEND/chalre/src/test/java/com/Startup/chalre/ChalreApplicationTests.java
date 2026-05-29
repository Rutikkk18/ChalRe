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
}

