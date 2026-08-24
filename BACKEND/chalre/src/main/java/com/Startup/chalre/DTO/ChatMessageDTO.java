package com.Startup.chalre.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChatMessageDTO {
    private Long rideId;
    private Long receiverId;

    @NotBlank(message = "Message is required")
    @Size(max = 255, message = "Message cannot exceed 255 characters")
    private String message;
}
