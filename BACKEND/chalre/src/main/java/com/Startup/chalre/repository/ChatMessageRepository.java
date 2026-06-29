package com.Startup.chalre.repository;

import com.Startup.chalre.entity.ChatMessage;
import com.Startup.chalre.entity.Ride;
import com.Startup.chalre.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByRideOrderByCreatedAtAsc(Ride ride);
    
    @Query("SELECT m FROM ChatMessage m WHERE m.ride = :ride AND (m.sender = :user OR m.receiver = :user) ORDER BY m.createdAt ASC")
    List<ChatMessage> findByRideAndUser(@Param("ride") Ride ride, @Param("user") User user);
    
    long countByRideAndReceiverAndIsReadFalse(Ride ride, User receiver);

    @Modifying
    @Query("UPDATE ChatMessage m SET m.isRead = true WHERE m.ride = :ride AND m.receiver = :user AND m.isRead = false")
    void markAllAsReadForRideAndReceiver(@Param("ride") Ride ride, @Param("user") User user);

    // ── Inbox queries ──────────────────────────────────────────

    /**
     * Find all distinct (rideId, otherUserId) conversation pairs for a given user ID.
     */
    @Query("SELECT DISTINCT m.ride.id, " +
           "CASE WHEN m.sender.id = :userId THEN m.receiver.id ELSE m.sender.id END " +
           "FROM ChatMessage m " +
           "WHERE m.sender.id = :userId OR m.receiver.id = :userId")
    List<Object[]> findDistinctConversationIds(@Param("userId") Long userId);

    /**
     * Get the latest message between two users on a specific ride.
     * Uses Pageable instead of LIMIT 1 to avoid JPQL syntax errors.
     */
    @Query("SELECT m FROM ChatMessage m " +
           "WHERE m.ride = :ride " +
           "AND ((m.sender = :user1 AND m.receiver = :user2) OR (m.sender = :user2 AND m.receiver = :user1)) " +
           "ORDER BY m.createdAt DESC")
    List<ChatMessage> findLatestMessageBetweenUsers(@Param("ride") Ride ride,
                                                    @Param("user1") User user1,
                                                    @Param("user2") User user2,
                                                    org.springframework.data.domain.Pageable pageable);

    /**
     * Count unread messages from a specific sender to a specific receiver on a ride.
     */
    long countByRideAndSenderAndReceiverAndIsReadFalse(Ride ride, User sender, User receiver);

    /**
     * Total unread messages across ALL conversations for the logged-in user.
     */
    long countByReceiverAndIsReadFalse(User receiver);

    @Query("SELECT m FROM ChatMessage m WHERE m.id IN (" +
           "  SELECT MAX(m2.id) FROM ChatMessage m2 " +
           "  WHERE m2.sender.id = :userId OR m2.receiver.id = :userId " +
           "  GROUP BY m2.ride.id, " +
           "           CASE WHEN m2.sender.id = :userId THEN m2.receiver.id ELSE m2.sender.id END" +
           ")")
    List<ChatMessage> findLatestMessagesForUserConversations(@Param("userId") Long userId);

    @Query("SELECT m.ride.id, m.sender.id, COUNT(m) " +
           "FROM ChatMessage m " +
           "WHERE m.receiver.id = :userId AND m.isRead = false " +
           "GROUP BY m.ride.id, m.sender.id")
    List<Object[]> countUnreadByRideAndSenderForReceiver(@Param("userId") Long userId);

    @Query("SELECT m FROM ChatMessage m WHERE m.ride = :ride AND (m.sender = :user OR m.receiver = :user) ORDER BY m.id DESC")
    List<ChatMessage> findByRideAndUserOrderByIdDesc(@Param("ride") Ride ride,
                                                     @Param("user") User user,
                                                     org.springframework.data.domain.Pageable pageable);

    @Query("SELECT m FROM ChatMessage m WHERE m.ride = :ride AND (m.sender = :user OR m.receiver = :user) AND m.id < :beforeId ORDER BY m.id DESC")
    List<ChatMessage> findByRideAndUserAndIdLessThanOrderByIdDesc(@Param("ride") Ride ride,
                                                                  @Param("user") User user,
                                                                  @Param("beforeId") Long beforeId,
                                                                  org.springframework.data.domain.Pageable pageable);
}
