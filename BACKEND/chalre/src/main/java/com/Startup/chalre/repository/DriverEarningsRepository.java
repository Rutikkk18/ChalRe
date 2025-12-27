package com.Startup.chalre.repository;

import com.Startup.chalre.entity.DriverEarnings;
import com.Startup.chalre.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DriverEarningsRepository extends JpaRepository<DriverEarnings, Long> {
    Optional<DriverEarnings> findByDriver(User driver);
    Optional<DriverEarnings> findByDriver_Id(Long driverId);
    boolean existsByDriver(User driver);
}

