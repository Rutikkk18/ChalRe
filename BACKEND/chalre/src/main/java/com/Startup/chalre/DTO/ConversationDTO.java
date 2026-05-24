package com.Startup.chalre.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ConversationDTO {
    private Long rideId;
    private String rideFrom;          // ride.startLocation
    private String rideTo;            // ride.endLocation
    private String rideDate;          // ride.date
    private String rideTime;          // ride.time
    private Long otherUserId;         // the person you're chatting with
    private String otherUserName;     // their name
    private String otherUserImage;    // their profileImage (for avatar in inbox)
    private String lastMessage;       // text of the most recent message
    private Instant lastMessageTime;  // when it was sent
    private long unreadCount;         // messages FROM otherUser TO you that are unread
    private boolean chatLocked;       // true if ride is > 48h ago
}
