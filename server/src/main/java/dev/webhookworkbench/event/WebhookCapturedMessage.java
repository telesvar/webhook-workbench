package dev.webhookworkbench.event;

import java.time.Instant;
import java.util.UUID;

import dev.webhookworkbench.api.WireType;

/// Body of a `webhook-captured` SSE event.
///
/// Flat (not a nested [EventSummary]) so clients can treat it as a summary plus the inbox total.
@WireType
record WebhookCapturedMessage(
        UUID id,
        UUID inboxId,
        String httpMethod,
        String contentType,
        Instant receivedAt,
        long eventCount) {

    static WebhookCapturedMessage of(WebhookCaptured notification) {
        var event = notification.event();
        return new WebhookCapturedMessage(
                event.id(),
                event.inboxId(),
                event.httpMethod(),
                event.contentType(),
                event.receivedAt(),
                notification.eventCount());
    }
}
