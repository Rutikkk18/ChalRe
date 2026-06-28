package com.Startup.chalre.repository;

import com.Startup.chalre.entity.Booking;
import com.Startup.chalre.entity.Ride;
import com.Startup.chalre.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByUser(User user);

    List<Booking> findByRide(Ride ride);

    List<Booking> findByRideIdAndUserIdAndStatus(Long rideId, Long userId, String status);

    /**
     * Batch-fetch booking counts for a set of ride IDs in ONE query.
     * Replaces the N+1 loop in MyRides.jsx that previously called
     * GET /rides/{id}/bookings for every single ride on page load.
     *
     * Returns: Object[] per row — [rideId (Long), activeCount (Long), totalCount (Long)]
     * where activeCount = number of BOOKED status bookings.
     */
    @Query("SELECT b.ride.id, " +
           "SUM(CASE WHEN b.status = 'BOOKED' THEN 1 ELSE 0 END), " +
           "COUNT(b.id) " +
           "FROM Booking b WHERE b.ride.id IN :rideIds GROUP BY b.ride.id")
    List<Object[]> findBookingCountsByRideIds(@Param("rideIds") List<Long> rideIds);
}
