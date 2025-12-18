package com.Startup.chalre.controller;

import com.Startup.chalre.DTO.RatingDTO;
import com.Startup.chalre.entity.Rating;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.service.RatingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/ratings")
@RequiredArgsConstructor
public class RatingController {

    private final RatingService ratingService;

    @PostMapping("/{rideId}")
    public ResponseEntity<?> rateride(@PathVariable Long rideId,
                                      @RequestBody RatingDTO dto,
                                      @AuthenticationPrincipal User user)
    {
        Rating r = ratingService.rateRide(rideId,dto.getStars(),dto.getComment(),user);
        return  ResponseEntity.ok(r);
    }

    @GetMapping("/driver/{driverId}")
    public ResponseEntity<?> getDriverRatings(@PathVariable Long driverId) {

        User driver = ratingService.getUserById(driverId);
        if (driver == null) {
            return ResponseEntity.badRequest().body("Driver not found");
        }

        return ResponseEntity.ok(ratingService.getRatingsForDriver(driver));
    }


}
