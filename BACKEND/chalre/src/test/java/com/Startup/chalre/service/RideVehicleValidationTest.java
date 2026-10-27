package com.Startup.chalre.service;

import com.Startup.chalre.DTO.RideDTO;
import com.Startup.chalre.DTO.RideUpdateDTO;
import com.Startup.chalre.entity.Ride;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.repository.NotificationRepository;
import com.Startup.chalre.repository.RideRepository;
import com.Startup.chalre.repository.SeatHoldRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RideVehicleValidationTest {

    @Mock
    private RideRepository rideRepository;

    @Mock
    private SeatHoldRepository seatHoldRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private MapService mapService;

    @InjectMocks
    private RideService rideService;

    private User driver;

    @BeforeEach
    void setUp() {
        driver = new User();
        driver.setId(100L);
        driver.setName("Driver Test");
    }

    @Test
    void testCreateRide_MissingVehicleType_ThrowsException() {
        RideDTO dto = new RideDTO();
        dto.setStartLocation("Mumbai");
        dto.setEndLocation("Pune");
        dto.setDate(LocalDate.now().plusDays(1).toString());
        dto.setTime("10:00");
        dto.setAvailableSeats(3);
        dto.setPrice(300.0);
        dto.setVehicleType(null);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            rideService.createRide(dto, driver);
        });
        assertTrue(ex.getMessage().contains("Vehicle type is required"));
    }

    @Test
    void testCreateRide_InvalidVehicleType_ThrowsException() {
        RideDTO dto = new RideDTO();
        dto.setStartLocation("Mumbai");
        dto.setEndLocation("Pune");
        dto.setDate(LocalDate.now().plusDays(1).toString());
        dto.setTime("10:00");
        dto.setAvailableSeats(3);
        dto.setPrice(300.0);
        dto.setVehicleType("TRUCK");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            rideService.createRide(dto, driver);
        });
        assertTrue(ex.getMessage().contains("Vehicle type must be either 'car' or 'bike'"));
    }

    @Test
    void testUpdateRide_InvalidVehicleType_ThrowsException() {
        Ride existingRide = new Ride();
        existingRide.setId(50L);
        existingRide.setDriver(driver);
        existingRide.setVehicleType("car");
        existingRide.setDate(LocalDate.now().plusDays(2).toString());
        existingRide.setTime("14:00");

        when(rideRepository.findByIdForUpdate(50L)).thenReturn(Optional.of(existingRide));

        RideUpdateDTO updateDTO = new RideUpdateDTO();
        updateDTO.setVehicleType("PLANE");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            rideService.updateRide(50L, updateDTO, driver);
        });
        assertTrue(ex.getMessage().contains("Vehicle type must be either 'car' or 'bike'"));
    }

    @Test
    void testUpdateRide_PreservesExistingVehicleTypeWhenNotProvided() {
        Ride existingRide = new Ride();
        existingRide.setId(50L);
        existingRide.setDriver(driver);
        existingRide.setVehicleType("bike");
        existingRide.setAvailableSeats(1);
        existingRide.setDate(LocalDate.now().plusDays(2).toString());
        existingRide.setTime("14:00");

        when(rideRepository.findByIdForUpdate(50L)).thenReturn(Optional.of(existingRide));
        when(rideRepository.save(any(Ride.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RideUpdateDTO updateDTO = new RideUpdateDTO();
        updateDTO.setPrice(150.0);
        updateDTO.setVehicleType(null); // Not provided

        Ride updated = rideService.updateRide(50L, updateDTO, driver);
        assertEquals("bike", updated.getVehicleType(), "Vehicle type must be preserved when not updated");
        assertEquals(150.0, updated.getPrice());
    }
}
