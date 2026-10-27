package com.Startup.chalre.service;

import com.Startup.chalre.entity.NotificationEntity;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.repository.DeviceTokenRepository;
import com.Startup.chalre.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationRetentionServiceTest {

    @Mock
    private DeviceTokenRepository tokenRepo;

    @Mock
    private NotificationRepository notificationRepo;

    @Mock
    private FcmService fcmService;

    @InjectMocks
    private NotificationService notificationService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("test@chalre.com");
    }

    @Test
    void testSendNotification_Sets7DayExpiration() {
        when(tokenRepo.findByUser(any(User.class))).thenReturn(Collections.emptyList());

        Instant before = Instant.now();
        notificationService.sendNotification(testUser, "Test Title", "Test Body", "SYSTEM", Collections.emptyMap());
        Instant after = Instant.now();

        ArgumentCaptor<NotificationEntity> captor = ArgumentCaptor.forClass(NotificationEntity.class);
        verify(notificationRepo).save(captor.capture());

        NotificationEntity saved = captor.getValue();
        assertNotNull(saved.getCreatedAt());
        assertNotNull(saved.getExpiresAt());

        // Check that expiresAt is approximately createdAt + 7 days
        long diffSeconds = ChronoUnit.SECONDS.between(saved.getCreatedAt(), saved.getExpiresAt());
        assertEquals(7 * 24 * 60 * 60, diffSeconds);

        assertFalse(saved.getCreatedAt().isBefore(before));
        assertFalse(saved.getCreatedAt().isAfter(after));
    }

    @Test
    void testGetNotifications_PassesCutoffAndExcludesExpired() {
        when(notificationRepo.findActiveByUserOrderByCreatedAtDesc(
                eq(testUser), any(Instant.class), any(Instant.class), any(PageRequest.class)
        )).thenReturn(Collections.emptyList());

        List<NotificationEntity> result = notificationService.getNotifications(testUser, 0, 20);
        assertNotNull(result);

        ArgumentCaptor<Instant> nowCaptor = ArgumentCaptor.forClass(Instant.now().getClass());
        ArgumentCaptor<Instant> cutoffCaptor = ArgumentCaptor.forClass(Instant.now().getClass());

        verify(notificationRepo).findActiveByUserOrderByCreatedAtDesc(
                eq(testUser), nowCaptor.capture(), cutoffCaptor.capture(), any(PageRequest.class)
        );

        long diffSeconds = ChronoUnit.SECONDS.between(cutoffCaptor.getValue(), nowCaptor.getValue());
        assertEquals(7 * 24 * 60 * 60, diffSeconds);
    }

    @Test
    void testMarkAsRead_PreservesOriginalExpiresAt() {
        Instant created = Instant.now().minus(2, ChronoUnit.DAYS);
        Instant originalExpiresAt = created.plus(7, ChronoUnit.DAYS);

        NotificationEntity n = new NotificationEntity();
        n.setId(10L);
        n.setUser(testUser);
        n.setCreatedAt(created);
        n.setExpiresAt(originalExpiresAt);
        n.setReadFlag(false);

        when(notificationRepo.findActiveByIdAndUser(eq(10L), eq(testUser), any(Instant.class), any(Instant.class)))
                .thenReturn(Optional.of(n));

        notificationService.markAsRead(10L, testUser);

        assertTrue(n.isReadFlag());
        assertEquals(originalExpiresAt, n.getExpiresAt(), "Reading a notification must not reset expiresAt");
        verify(notificationRepo).save(n);
    }

    @Test
    void testCleanupExpiredNotifications_CallsRepositoryDeletion() {
        when(notificationRepo.deleteExpiredNotifications(any(Instant.class), any(Instant.class))).thenReturn(5);

        assertDoesNotThrow(() -> notificationService.cleanupExpiredNotifications());
        verify(notificationRepo).deleteExpiredNotifications(any(Instant.class), any(Instant.class));
    }
}
