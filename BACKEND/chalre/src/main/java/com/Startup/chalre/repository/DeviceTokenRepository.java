package com.Startup.chalre.repository;

import com.Startup.chalre.entity.DeviceToken;
import com.Startup.chalre.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DeviceTokenRepository extends JpaRepository<DeviceToken,Long> {
    List<DeviceToken> findByUser(User user);
    DeviceToken findByToken(String token);

}
