package com.Startup.chalre.service;
import com.Startup.chalre.service.FcmService;

import com.Startup.chalre.DTO.DeviceTokenDTO;
import com.Startup.chalre.entity.DeviceToken;
import com.Startup.chalre.entity.NotificationEntity;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.repository.DeviceTokenRepository;
import com.Startup.chalre.repository.NotificationRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final DeviceTokenRepository tokenRepo;
    private final NotificationRepository notificationRepo;
    private final FcmService fcmService;

    /**
     * Register or update device token
     */
    @Transactional
    public void registerDeviceToken(User user, DeviceTokenDTO dto) {

        DeviceToken existing = tokenRepo.findByToken(dto.getToken());
        if (existing != null) {
            // update timestamp & platform
            existing.setPlatform(dto.getPlatform());
            existing.setCreatedAt(LocalDateTime.now());
            tokenRepo.save(existing);
            return;
        }

        // create new token
        DeviceToken t = new DeviceToken();
        t.setUser(user);
        t.setToken(dto.getToken());
        t.setPlatform(dto.getPlatform());
        t.setCreatedAt(LocalDateTime.now());
        tokenRepo.save(t);
    }

    /**
     * Save + push notification
     */
    @Transactional
    public void sendNotification(User user, String title, String body, String type, Map<String, String> data) {

        NotificationEntity n = new NotificationEntity();
        n.setUser(user);
        n.setTitle(title);
        n.setBody(body);
        n.setType(type);
        n.setReadFlag(false);
        n.setCreatedAt(LocalDateTime.now());
        notificationRepo.save(n);

        // send push
        List<DeviceToken> tokens = tokenRepo.findByUser(user);

        for (DeviceToken t : tokens) {
            boolean ok = fcmService.sendPush(t.getToken(), title, body, data);
            if (!ok) {
                // delete invalid token
                tokenRepo.delete(t);
            }
        }
    }

    /**
     * Fetch user notifications (paginated)
     */
    public List<NotificationEntity> getNotifications(User user, int page, int size) {
        return notificationRepo.findByUserOrderByCreatedAtDesc(
                user, PageRequest.of(page, size)
        );
    }

    /**
     * Mark notification as read
     */
    @Transactional
    public void markAsRead(Long id, User user) {
        NotificationEntity n = notificationRepo.findByIdAndUser(id, user)
                .orElseThrow(() -> new RuntimeException("Not found"));

        n.setReadFlag(true);
        notificationRepo.save(n);
    }

    /**
     * Delete notification
     */
    @Transactional
    public void deleteNotification(Long id, User user) {
        NotificationEntity n = notificationRepo.findByIdAndUser(id, user)
                .orElseThrow(() -> new RuntimeException("Not found"));

        notificationRepo.delete(n);
    }
}
