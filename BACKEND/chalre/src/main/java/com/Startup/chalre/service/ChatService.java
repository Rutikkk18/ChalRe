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
import com.Startup.chalre.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final RideRepository rideRepository;
    private final BookingRepository bookingRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;

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
            java.time.LocalDateTime now = java.time.ZonedDateTime.now(java.time.ZoneId.of("Asia/Kolkata")).toLocalDateTime();
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
        return getChatMessages(rideId, user, null, null);
    }

    public List<ChatMessage> getChatMessages(Long rideId, User user, Integer limit, Long beforeMessageId) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        if (limit == null && beforeMessageId == null) {
            // Get all messages for this ride where user is sender or receiver
            return chatMessageRepository.findByRideAndUser(ride, user);
        }

        int pageSize = limit != null ? limit : 50;

        List<ChatMessage> messages;
        if (beforeMessageId != null) {
            messages = chatMessageRepository.findByRideAndUserAndIdLessThanOrderByIdDesc(ride, user, beforeMessageId, PageRequest.of(0, pageSize));
        } else {
            messages = chatMessageRepository.findByRideAndUserOrderByIdDesc(ride, user, PageRequest.of(0, pageSize));
        }

        List<ChatMessage> chronological = new ArrayList<>(messages);
        java.util.Collections.reverse(chronological);
        return chronological;
    }

    @Transactional
    public void markAsRead(Long rideId, User user) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        chatMessageRepository.markAllAsReadForRideAndReceiver(ride, user);
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
        List<Object[]> conversationPairs = chatMessageRepository.findDistinctConversationIds(user.getId());
        if (conversationPairs.isEmpty()) {
            return new ArrayList<>();
        }

        // Collect all distinct ride IDs and user IDs to fetch in batch
        List<Long> rideIds = new ArrayList<>();
        List<Long> otherUserIds = new ArrayList<>();
        for (Object[] pair : conversationPairs) {
            if (pair[0] != null) rideIds.add((Long) pair[0]);
            if (pair[1] != null) otherUserIds.add((Long) pair[1]);
        }

        // Fetch Rides and Users in batch
        Map<Long, Ride> ridesMap = rideRepository.findAllById(rideIds).stream()
                .collect(Collectors.toMap(Ride::getId, r -> r, (r1, r2) -> r1));
        Map<Long, User> usersMap = userRepository.findAllById(otherUserIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u, (u1, u2) -> u1));

        // Fetch latest messages in batch
        List<ChatMessage> latestMessages = chatMessageRepository.findLatestMessagesForUserConversations(user.getId());
        Map<String, ChatMessage> latestMsgMap = new HashMap<>();
        for (ChatMessage m : latestMessages) {
            if (m.getRide() != null && m.getSender() != null && m.getReceiver() != null) {
                Long rId = m.getRide().getId();
                Long otherId = m.getSender().getId().equals(user.getId()) ? m.getReceiver().getId() : m.getSender().getId();
                latestMsgMap.put(rId + "-" + otherId, m);
            }
        }

        // Fetch unread counts in batch
        List<Object[]> unreadCounts = chatMessageRepository.countUnreadByRideAndSenderForReceiver(user.getId());
        Map<String, Long> unreadMap = new HashMap<>();
        for (Object[] row : unreadCounts) {
            if (row[0] != null && row[1] != null && row[2] != null) {
                Long rId = (Long) row[0];
                Long sId = (Long) row[1];
                Long count = (Long) row[2];
                unreadMap.put(rId + "-" + sId, count);
            }
        }

        List<ConversationDTO> conversations = new ArrayList<>();
        for (Object[] pair : conversationPairs) {
            Long rideId = (Long) pair[0];
            Long otherUserId = (Long) pair[1];

            if (rideId == null || otherUserId == null) continue;

            Ride ride = ridesMap.get(rideId);
            User otherUser = usersMap.get(otherUserId);

            if (ride == null || otherUser == null) continue;

            ChatMessage latestMsg = latestMsgMap.get(rideId + "-" + otherUserId);
            if (latestMsg == null) continue;

            long unread = unreadMap.getOrDefault(rideId + "-" + otherUserId, 0L);

            boolean chatLocked = false;
            try {
                LocalDateTime rideDateTime = ride.getRideDateTime();
                chatLocked = java.time.ZonedDateTime.now(java.time.ZoneId.of("Asia/Kolkata")).toLocalDateTime().isAfter(rideDateTime.plusHours(48));
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

