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

    List<Ride> findByStartLocationIgnoreCaseAndEndLocationIgnoreCase(
            String startLocation, String endLocation);

    List<Ride> findByStartLocationContainingIgnoreCaseAndEndLocationContainingIgnoreCase(
            String startLocation, String endLocation);

    List<Ride> findByDriver(User driver);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Ride r WHERE r.id = :id")
    Optional<Ride> findByIdForUpdate(Long id);

    List<Ride> findByStatus(String status);

    /**
     * PostGIS spatial query to find rides whose stored route passes through
     * both the pickup and drop points (in that order, i.e. pickup comes before
     * drop along the route direction).
     * <p>
     * Key fixes vs the old query:
     * 1. r.route IS NOT NULL  — skip rides that only have a fallback straight-line
     * or no geometry at all; straight lines cause false direction matches.
     * 2. ST_ClosestPoint before ST_LineLocatePoint — gets a stable fraction
     * even when the point is not exactly on the line.
     * 3. fraction difference > 0.05 (was 0.02) — eliminates noise where
     * pickup and drop are nearly the same point on the line.
     * 4. Both DWithin checks use 5000m (5km) radius — tight enough to avoid
     * matching a city that is "near" the route but behind the origin.
     */
    @Query(value = """
            SELECT * FROM ride r
            WHERE r.route IS NOT NULL
              AND (r.is_fallback_route = false OR r.is_fallback_route IS NULL)
              AND ST_DWithin(
                    CAST(r.route AS geography),
                    CAST(ST_SetSRID(ST_MakePoint(:pLng, :pLat), 4326) AS geography),
                    15000
                  )
              AND ST_DWithin(
                    CAST(r.route AS geography),
                    CAST(ST_SetSRID(ST_MakePoint(:dLng, :dLat), 4326) AS geography),
                    15000
                  )
              AND (
                    ST_LineLocatePoint(
                        CAST(r.route AS geometry),
                        ST_ClosestPoint(
                            CAST(r.route AS geometry),
                            ST_SetSRID(ST_MakePoint(:dLng, :dLat), 4326)
                        )
                    )
                    -
                    ST_LineLocatePoint(
                        CAST(r.route AS geometry),
                        ST_ClosestPoint(
                            CAST(r.route AS geometry),
                            ST_SetSRID(ST_MakePoint(:pLng, :pLat), 4326)
                        )
                    )
                  ) > 0.05
            """,
            nativeQuery = true)
    List<Ride> findValidRidesForRoute(
            @Param("pLat") double pLat, @Param("pLng") double pLng,
            @Param("dLat") double dLat, @Param("dLng") double dLng);

}