package dev.webhookworkbench.event;

import java.time.Clock;
import java.util.List;
import java.util.Map;

import dev.webhookworkbench.Uuid;
import dev.webhookworkbench.inbox.InboxStore;
import dev.webhookworkbench.problem.WorkbenchException;
import tools.jackson.databind.ObjectMapper;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class WebhookCaptureService {

    private final InboxStore inboxes;
    private final EventStore events;
    private final ObjectMapper objectMapper;
    private final ApplicationEventPublisher eventPublisher;
    private final Clock clock;
    private final int retentionMaximum;

    WebhookCaptureService(
            InboxStore inboxes,
            EventStore events,
            ObjectMapper objectMapper,
            ApplicationEventPublisher eventPublisher,
            Clock clock,
            @Value("${workbench.retention.max-events-per-inbox:500}") int retentionMaximum) {
        if (retentionMaximum < 1) {
            throw new IllegalArgumentException("Retention maximum must be positive");
        }
        this.inboxes = inboxes;
        this.events = events;
        this.objectMapper = objectMapper;
        this.eventPublisher = eventPublisher;
        this.clock = clock;
        this.retentionMaximum = retentionMaximum;
    }

    @Transactional
    CaptureReceipt capture(
            String slug,
            String httpMethod,
            String contentType,
            Map<String, List<String>> headers,
            String body) {
        var inboxId = inboxes.lockBySlug(slug)
                .orElseThrow(() -> WorkbenchException.inboxNotFound("No inbox exists for slug '" + slug + "'."));
        var id = Uuid.v7(clock.instant());
        var receivedAt = Uuid.instant(id);
        events.insert(id, inboxId, httpMethod, contentType, objectMapper.writeValueAsString(headers), body);

        var captured = events.countByInbox(inboxId);
        var excess = Math.toIntExact(Math.max(0, captured - retentionMaximum));
        events.deleteOldest(inboxId, excess);

        var summary = new EventSummary(id, inboxId, httpMethod, contentType, receivedAt);
        eventPublisher.publishEvent(new WebhookCaptured(summary, captured - excess));
        return new CaptureReceipt(id, receivedAt);
    }
}
