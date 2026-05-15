package com.Startup.chalre.repository;

import com.Startup.chalre.entity.ChatMessage;
import com.Startup.chalre.entity.Ride;
import com.Startup.chalre.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByRideOrderByCreatedAtAsc(Ride ride);
    
    @Query("SELECT m FROM ChatMessage m WHERE m.ride = :ride AND (m.sender = :user OR m.receiver = :user) ORDER BY m.createdAt ASC")
    List<ChatMessage> findByRideAndUser(@Param("ride") Ride ride, @Param("user") User user);
    
    long countByRideAndReceiverAndIsReadFalse(Ride ride, User receiver);

    // ── Inbox queries ──────────────────────────────────────────

    /**
     * Find all distinct (ride, otherUser) conversation pairs for a given user.
     * Returns Object[] rows: [Ride, User] where User is the "other" person.
     */
    @Query("SELECT DISTINCT m.ride, " +
           "CASE WHEN m.sender = :user THEN m.receiver ELSE m.sender END " +
           "FROM ChatMessage m " +
           "WHERE m.sender = :user OR m.receiver = :user")
    List<Object[]> findDistinctConversations(@Param("user") User user);

    /**
     * Get the latest message between two users on a specific ride.
     */
    @Query("SELECT m FROM ChatMessage m " +
           "WHERE m.ride = :ride " +
           "AND ((m.sender = :user1 AND m.receiver = :user2) OR (m.sender = :user2 AND m.receiver = :user1)) " +
           "ORDER BY m.createdAt DESC " +
           "LIMIT 1")
    ChatMessage findLatestMessageBetweenUsers(@Param("ride") Ride ride,
                                              @Param("user1") User user1,
                                              @Param("user2") User user2);

    /**
     * Count unread messages from a specific sender to a specific receiver on a ride.
     */
    long countByRideAndSenderAndReceiverAndIsReadFalse(Ride ride, User sender, User receiver);

    /**
     * Total unread messages across ALL conversations for the logged-in user.
     */
    long countByReceiverAndIsReadFalse(User receiver);
}
