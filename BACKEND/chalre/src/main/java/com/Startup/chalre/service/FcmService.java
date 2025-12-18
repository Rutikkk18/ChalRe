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

            Message message = Message.builder()
                    .setToken(token)
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .putAllData(data)
                    .build();

            FirebaseMessaging.getInstance().send(message);
            return true;

        } catch (Exception e) {
            System.out.println("❌ Invalid FCM token: " + token);
            return false;
        }
    }
}
