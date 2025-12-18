package com.Startup.chalre.service;

import com.Startup.chalre.DTO.RatingDTO;
import com.Startup.chalre.entity.Rating;
import com.Startup.chalre.entity.Ride;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.repository.BookingRepository;
import com.Startup.chalre.repository.RatingRepository;
import com.Startup.chalre.repository.RideRepository;
import com.Startup.chalre.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;


@Service
@RequiredArgsConstructor
public class RatingService {


    private final RatingRepository ratingRepository;
    private final BookingRepository bookingRepository;
    private final RideRepository rideRepository;
    private final UserRepository userRepository;

    @Transactional
    public Rating rateRide(Long rideId, int stars, String comment, User rater) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        boolean hasBooking = bookingRepository.findByUser(rater)
                .stream()
                .anyMatch(b -> b.getRide().getId().equals(rideId) && "BOOKED".equals(b.getStatus()));

        if (!hasBooking) throw new RuntimeException("You must book the ride before rating");

        if (ratingRepository.existsByRaterAndRide(rater, ride)) throw new RuntimeException("Already rated this ride");


        Rating rating = new Rating();
        rating.setRater(rater);
        rating.setRide(ride);
        rating.setDriver(ride.getDriver());
        rating.setStars(stars);
        rating.setComment(comment);
        rating.setCreatedAt(LocalDateTime.now());

        Rating saved = ratingRepository.save(rating);

        // Update driver's aggregate
        User driver = ride.getDriver();
        int oldCount = driver.getRatingCount() == null ? 0 : driver.getRatingCount();
        double oldAvg = driver.getAvgRating() == null ? 0.0 : driver.getAvgRating();
        double newAvg = (oldAvg * oldCount + stars) / (oldCount + 1);
        driver.setAvgRating(newAvg);
        driver.setRatingCount(oldCount + 1);
        userRepository.save(driver);

        return saved;

    }
    public java.util.List<Rating> getRatingsForDriver(User driver) {
        return ratingRepository.findByDriver(driver);
    }

    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }


}