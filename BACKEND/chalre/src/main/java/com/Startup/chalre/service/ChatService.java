package com.Startup.chalre.service;

import com.Startup.chalre.DTO.ChatMessageDTO;
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
}
