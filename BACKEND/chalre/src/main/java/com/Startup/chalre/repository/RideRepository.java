package com.Startup.chalre.repository;

import com.Startup.chalre.entity.Ride;
import com.Startup.chalre.entity.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RideRepository extends JpaRepository<Ride, Long> {

    // ❌ OLD METHOD - Exact match (keep it for now, but won't use it)
    List<Ride> findByStartLocationIgnoreCaseAndEndLocationIgnoreCase(String startLocation, String endLocation);

    // ✅ NEW METHOD - Partial match (CONTAINS)
    List<Ride> findByStartLocationContainingIgnoreCaseAndEndLocationContainingIgnoreCase(String startLocation, String endLocation);

    List<Ride> findByDriver(User driver);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Ride r WHERE r.id = :id")
    Optional<Ride> findByIdForUpdate(Long id);

    List<Ride> findByStatus(String status);

    @Query(value = "SELECT * FROM ride r WHERE " +
           "ST_DWithin(r.route, CAST(ST_SetSRID(ST_MakePoint(:pLng, :pLat), 4326) AS geography), 15000) AND " +
           "ST_DWithin(r.route, CAST(ST_SetSRID(ST_MakePoint(:dLng, :dLat), 4326) AS geography), 15000) AND " +
           "ST_LineLocatePoint(CAST(r.route AS geometry), ST_SetSRID(ST_MakePoint(:pLng, :pLat), 4326)) < " +
           "ST_LineLocatePoint(CAST(r.route AS geometry), ST_SetSRID(ST_MakePoint(:dLng, :dLat), 4326))", 
           nativeQuery = true)
    List<Ride> findValidRidesForRoute(@Param("pLat") double pLat, @Param("pLng") double pLng, @Param("dLat") double dLat, @Param("dLng") double dLng);
}