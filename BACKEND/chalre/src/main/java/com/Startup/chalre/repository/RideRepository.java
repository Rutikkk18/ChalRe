package com.Startup.chalre.repository;

import com.Startup.chalre.entity.Ride;
import com.Startup.chalre.entity.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface RideRepository extends JpaRepository<Ride, Long> {

    List<Ride> findByStartLocationIgnoreCaseAndEndLocationIgnoreCase(String startLocation, String endLocation);

    List<Ride> findByDriver(User driver);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Ride r WHERE r.id = :id")
    Optional<Ride> findByIdForUpdate(Long id);
    List<Ride> findByStatus(String status);



}

