package com.Startup.chalre.DTO;

import lombok.Data;

@Data
public class ChatMessageDTO {
    private Long rideId;
    private Long receiverId;
    private String message;
}
