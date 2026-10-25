package com.Startup.chalre.service;

import com.Startup.chalre.entity.WebhookEvent;
import com.Startup.chalre.entity.WebhookStatus;
import com.Startup.chalre.repository.WebhookEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class WebhookService {

    private static final Logger logger = LoggerFactory.getLogger(WebhookService.class);

    private final WebhookEventRepository webhookEventRepository;

    public WebhookService(WebhookEventRepository webhookEventRepository) {
        this.webhookEventRepository = webhookEventRepository;
    }

    /**
     * Ingests and persists an incoming webhook event.
     * Guarantees durable persistence before acknowledgement.
     * Deduplicates using Razorpay event ID: if already received, acknowledges without re-insert.
     *
     * @return true if newly saved, false if already present (idempotent duplicate)
     */
    @Transactional
    public boolean ingestWebhookEvent(String eventId, String eventType, String rawPayload) {
        if (eventId == null || eventId.isBlank()) {
            throw new IllegalArgumentException("Webhook event ID cannot be null or empty");
        }
        if (eventType == null || eventType.isBlank()) {
            throw new IllegalArgumentException("Webhook event type cannot be null or empty");
        }
        if (rawPayload == null || rawPayload.isBlank()) {
            throw new IllegalArgumentException("Webhook raw payload cannot be null or empty");
        }

        Optional<WebhookEvent> existing = webhookEventRepository.findByEventId(eventId);
        if (existing.isPresent()) {
            logger.info("Webhook event {} already ingested with status {}. Acknowledging duplicate delivery.",
                    eventId, existing.get().getStatus());
            return false;
        }

        WebhookEvent event = WebhookEvent.builder()
                .eventId(eventId)
                .eventType(eventType)
                .payload(rawPayload)
                .status(WebhookStatus.RECEIVED)
                .receivedAt(LocalDateTime.now())
                .build();

        webhookEventRepository.save(event);
        logger.info("Webhook event {} ({}) durably persisted with status RECEIVED.", eventId, eventType);
        return true;
    }
}
