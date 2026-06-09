package com.Startup.chalre.service;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class FcmService {

    public boolean sendPush(String token, String title, String body, Map<String, String> data) {
        try {
            System.out.println("📤 Attempting to send FCM push to token: " + token);

            Message.Builder messageBuilder = Message.builder()
                    .setToken(token)
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build());

            if (data != null && !data.isEmpty()) {
                messageBuilder.putAllData(data);
            }

            Message message = messageBuilder.build();
            FirebaseMessaging.getInstance().send(message);
            System.out.println("✅ FCM push sent successfully to token: " + token);
            return true;

        } catch (Exception e) {
            System.err.println("❌ Failed to send FCM push to token: " + token + ", Error: " + e.getMessage());
            return false;
        }
    }
}
