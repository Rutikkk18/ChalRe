package com.Startup.chalre.repository;

import com.Startup.chalre.entity.Rating;
import com.Startup.chalre.entity.Ride;
import com.Startup.chalre.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RatingRepository extends JpaRepository<Rating,Long> {
    boolean existsByRaterAndRide(User rater, Ride ride);
    List<Rating> findByDriver(User driver);


}
