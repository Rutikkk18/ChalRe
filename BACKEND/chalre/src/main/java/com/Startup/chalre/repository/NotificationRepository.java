package com.Startup.chalre.repository;

import com.Startup.chalre.entity.NotificationEntity;
import com.Startup.chalre.entity.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<NotificationEntity, Long> {

    List<NotificationEntity> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);

    Optional<NotificationEntity> findByIdAndUser(Long id, User user);
}
