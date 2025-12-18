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
}
