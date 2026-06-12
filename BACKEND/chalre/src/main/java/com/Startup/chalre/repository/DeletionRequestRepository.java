package com.Startup.chalre.repository;

import com.Startup.chalre.entity.DeletionRequest;
import com.Startup.chalre.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeletionRequestRepository extends JpaRepository<DeletionRequest, Long> {
    boolean existsByUserAndStatus(User user, String status);
    Optional<DeletionRequest> findTopByUserOrderByCreatedAtDesc(User user);
    List<DeletionRequest> findAllByOrderByCreatedAtDesc();
}
