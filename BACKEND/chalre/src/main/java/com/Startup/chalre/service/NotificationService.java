package com.Startup.chalre.service;

import com.Startup.chalre.DTO.DeviceTokenDTO;
import com.Startup.chalre.entity.DeviceToken;
import com.Startup.chalre.entity.NotificationEntity;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.repository.DeviceTokenRepository;
import com.Startup.chalre.repository.NotificationRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
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
            existing.setCreatedAt(Instant.now());
            tokenRepo.save(existing);
            return;
        }

        // create new token
        DeviceToken t = new DeviceToken();
        t.setUser(user);
        t.setToken(dto.getToken());
        t.setPlatform(dto.getPlatform());
        t.setCreatedAt(Instant.now());
        tokenRepo.save(t);
    }

    /**
     * Save + push notification
     */
    @Transactional
    public void sendNotification(User user, String title, String body, String type, Map<String, String> data) {

        Instant now = Instant.now();
        NotificationEntity n = new NotificationEntity();
        n.setUser(user);
        n.setTitle(title);
        n.setBody(body);
        n.setType(type);
        n.setReadFlag(false);
        n.setCreatedAt(now);
        n.setExpiresAt(now.plus(7, ChronoUnit.DAYS));
        notificationRepo.save(n);

        // send push
        List<DeviceToken> tokens = tokenRepo.findByUser(user);

        for (DeviceToken t : tokens) {
            try {
                boolean ok = fcmService.sendPush(t.getToken(), title, body, data);
                if (!ok) {
                    tokenRepo.delete(t);
                    System.out.println("🗑️ Stale/invalid device token removed from database: " + t.getToken());
                }
            } catch (Exception e) {
                System.err.println("⚠️ Exception occurred while sending push to token: " + t.getToken() + " - " + e.getMessage());
            }
        }
    }

    /**
     * Fetch user notifications (paginated, excluding expired past 7 days)
     */
    public List<NotificationEntity> getNotifications(User user, int page, int size) {
        Instant now = Instant.now();
        Instant cutoff = now.minus(7, ChronoUnit.DAYS);
        return notificationRepo.findActiveByUserOrderByCreatedAtDesc(
                user, now, cutoff, PageRequest.of(page, size)
        );
    }

    /**
     * Mark notification as read (does NOT reset expiresAt)
     */
    @Transactional
    public void markAsRead(Long id, User user) {
        Instant now = Instant.now();
        Instant cutoff = now.minus(7, ChronoUnit.DAYS);
        NotificationEntity n = notificationRepo.findActiveByIdAndUser(id, user, now, cutoff)
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

    /**
     * Scheduled cleanup job: purges notifications older than 7 days from inbox
     */
    @Scheduled(cron = "${chalre.notifications.cleanup-cron:0 0 3 * * ?}")
    @Transactional
    public void cleanupExpiredNotifications() {
        try {
            Instant now = Instant.now();
            Instant cutoff = now.minus(7, ChronoUnit.DAYS);
            int deleted = notificationRepo.deleteExpiredNotifications(now, cutoff);
            if (deleted > 0) {
                log.info("Cleaned up {} expired notifications older than 7 days.", deleted);
            }
        } catch (Exception e) {
            log.error("Failed to clean up expired notifications: {}", e.getMessage());
        }
    }
}
