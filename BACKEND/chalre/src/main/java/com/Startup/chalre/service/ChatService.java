package com.Startup.chalre.service;

import com.Startup.chalre.DTO.ChatMessageDTO;
import com.Startup.chalre.DTO.ConversationDTO;
import com.Startup.chalre.entity.Booking;
import com.Startup.chalre.entity.ChatMessage;
import com.Startup.chalre.entity.Ride;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.repository.BookingRepository;
import com.Startup.chalre.repository.ChatMessageRepository;
import com.Startup.chalre.repository.RideRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final RideRepository rideRepository;
    private final BookingRepository bookingRepository;
    private final NotificationService notificationService;

    @Transactional
    public ChatMessage sendMessage(ChatMessageDTO dto, User sender) {
        Ride ride = rideRepository.findById(dto.getRideId())
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        // Validate: sender must be driver or a passenger who booked this ride
        boolean isDriver = ride.getDriver().getId().equals(sender.getId());
        boolean isPassenger = bookingRepository.findByRide(ride).stream()
                .anyMatch(b -> b.getUser().getId().equals(sender.getId()) && "BOOKED".equals(b.getStatus()));

        if (!isDriver && !isPassenger) {
            throw new RuntimeException("You can only chat about rides you're involved in");
        }

        // Receiver must be driver or a passenger of this ride
        User receiver = ride.getDriver().getId().equals(dto.getReceiverId()) 
            ? ride.getDriver() 
            : bookingRepository.findByRide(ride).stream()
                .filter(b -> b.getUser().getId().equals(dto.getReceiverId()) && "BOOKED".equals(b.getStatus()))
                .map(Booking::getUser)
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Invalid receiver"));

        // 48-hour post-ride chat window check
        try {
            java.time.LocalDateTime rideDateTime = ride.getRideDateTime();
            java.time.LocalDateTime now = java.time.LocalDateTime.now();
            if (now.isAfter(rideDateTime.plusHours(48))) {
                throw new RuntimeException("Chat locked — ride ended more than 48 hours ago");
            }
        } catch (RuntimeException e) {
            if (e.getMessage() != null && e.getMessage().startsWith("Chat locked")) {
                throw e;
            }
            // If date/time parsing fails, allow the message (don't block on bad data)
        }

        ChatMessage chatMessage = new ChatMessage();
        chatMessage.setRide(ride);
        chatMessage.setSender(sender);
        chatMessage.setReceiver(receiver);
        chatMessage.setMessage(dto.getMessage());
        chatMessage.setIsRead(false);

        ChatMessage saved = chatMessageRepository.save(chatMessage);

        // 🔔 Notify receiver
        notificationService.sendNotification(
                receiver,
                "New Message",
                sender.getName() + ": " + (dto.getMessage().length() > 50 
                    ? dto.getMessage().substring(0, 50) + "..." 
                    : dto.getMessage()),
                "CHAT_MESSAGE",
                Map.of(
                        "rideId", ride.getId().toString(),
                        "senderId", sender.getId().toString()
                )
        );

        return saved;
    }

    public List<ChatMessage> getChatMessages(Long rideId, User user) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        // Get all messages for this ride where user is sender or receiver
        return chatMessageRepository.findByRideAndUser(ride, user);
    }

    @Transactional
    public void markAsRead(Long rideId, User user) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        List<ChatMessage> unreadMessages = chatMessageRepository.findByRideAndUser(ride, user)
                .stream()
                .filter(m -> !m.getIsRead() && m.getReceiver().getId().equals(user.getId()))
                .toList();

        unreadMessages.forEach(m -> {
            m.setIsRead(true);
            chatMessageRepository.save(m);
        });
    }

    public long getUnreadCount(Long rideId, User user) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));
        return chatMessageRepository.countByRideAndReceiverAndIsReadFalse(ride, user);
    }

    // ── Inbox methods ──────────────────────────────────────────

    /**
     * Get all conversations for the logged-in user, sorted by most recent message.
     * Each conversation is a unique (ride, otherUser) pair.
     */
    public List<ConversationDTO> getConversations(User user) {
        List<Object[]> conversationPairs = chatMessageRepository.findDistinctConversations(user);
        List<ConversationDTO> conversations = new ArrayList<>();

        for (Object[] pair : conversationPairs) {
            Ride ride = (Ride) pair[0];
            User otherUser = (User) pair[1];

            // Skip if either is null (shouldn't happen, but safety)
            if (ride == null || otherUser == null) continue;

            // Get latest message in this conversation
            ChatMessage latestMsg = chatMessageRepository.findLatestMessageBetweenUsers(ride, user, otherUser);
            if (latestMsg == null) continue;

            // Count unread messages FROM otherUser TO me
            long unread = chatMessageRepository.countByRideAndSenderAndReceiverAndIsReadFalse(ride, otherUser, user);

            // Compute chat lock status (48h after ride)
            boolean chatLocked = false;
            try {
                LocalDateTime rideDateTime = ride.getRideDateTime();
                chatLocked = LocalDateTime.now().isAfter(rideDateTime.plusHours(48));
            } catch (Exception e) {
                // If date parsing fails, don't lock
            }

            ConversationDTO dto = new ConversationDTO(
                    ride.getId(),
                    ride.getStartLocation(),
                    ride.getEndLocation(),
                    ride.getDate(),
                    ride.getTime(),
                    otherUser.getId(),
                    otherUser.getName(),
                    otherUser.getProfileImage(),
                    latestMsg.getMessage(),
                    latestMsg.getCreatedAt(),
                    unread,
                    chatLocked
            );

            conversations.add(dto);
        }

        // Sort by latest message time descending (most recent first)
        conversations.sort(Comparator.comparing(ConversationDTO::getLastMessageTime,
                Comparator.nullsLast(Comparator.reverseOrder())));

        return conversations;
    }

    /**
     * Total unread message count across ALL conversations for the user.
     * Used for the navbar badge.
     */
    public long getTotalUnreadCount(User user) {
        return chatMessageRepository.countByReceiverAndIsReadFalse(user);
    }
}

