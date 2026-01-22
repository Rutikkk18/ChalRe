package com.Startup.chalre.repository;

import com.Startup.chalre.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    Optional<User> findByUid(String uid);

    Optional<User> findByPhone(String phone);

    List<User> findByVerificationStatus(String verificationStatus);

    List<User> findByIsDriverVerified(Boolean isDriverVerified);



}
