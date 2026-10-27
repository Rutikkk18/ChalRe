package com.Startup.chalre.repository;

import com.Startup.chalre.entity.NotificationEntity;
import com.Startup.chalre.entity.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<NotificationEntity, Long> {

    List<NotificationEntity> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);

    @Query("SELECT n FROM NotificationEntity n WHERE n.user = :user AND (n.expiresAt > :now OR (n.expiresAt IS NULL AND n.createdAt > :cutoff)) ORDER BY n.createdAt DESC")
    List<NotificationEntity> findActiveByUserOrderByCreatedAtDesc(
            @Param("user") User user,
            @Param("now") Instant now,
            @Param("cutoff") Instant cutoff,
            Pageable pageable
    );

    Optional<NotificationEntity> findByIdAndUser(Long id, User user);

    @Query("SELECT n FROM NotificationEntity n WHERE n.id = :id AND n.user = :user AND (n.expiresAt > :now OR (n.expiresAt IS NULL AND n.createdAt > :cutoff))")
    Optional<NotificationEntity> findActiveByIdAndUser(
            @Param("id") Long id,
            @Param("user") User user,
            @Param("now") Instant now,
            @Param("cutoff") Instant cutoff
    );

    @Modifying
    @Transactional
    @Query("DELETE FROM NotificationEntity n WHERE n.expiresAt <= :now OR (n.expiresAt IS NULL AND n.createdAt <= :cutoff)")
    int deleteExpiredNotifications(@Param("now") Instant now, @Param("cutoff") Instant cutoff);
}
