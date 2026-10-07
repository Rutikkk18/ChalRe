package com.Startup.chalre.repository;

import com.Startup.chalre.entity.RefreshToken;
import com.Startup.chalre.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("UPDATE RefreshToken r SET r.revokedAt = :now, r.replacedByTokenHash = :newHash " +
           "WHERE r.tokenHash = :oldHash AND r.revokedAt IS NULL AND r.expiresAt > :now")
    int rotateTokenAtomically(@Param("oldHash") String oldHash,
                             @Param("newHash") String newHash,
                             @Param("now") Instant now);

    @Modifying
    @Query("UPDATE RefreshToken r SET r.revokedAt = :now WHERE r.user = :user AND r.revokedAt IS NULL")
    void revokeAllByUser(@Param("user") User user, @Param("now") Instant now);

    @Modifying
    @Query("DELETE FROM RefreshToken r WHERE r.expiresAt < :now")
    void deleteExpiredTokens(@Param("now") Instant now);
}
