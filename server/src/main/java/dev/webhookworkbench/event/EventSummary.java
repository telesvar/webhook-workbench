package dev.webhookworkbench.event;

import java.time.Instant;
import java.util.UUID;

import dev.webhookworkbench.api.WireType;

@WireType
public record EventSummary(
        UUID id,
        UUID inboxId,
        String httpMethod,
        String contentType,
        Instant receivedAt) {
}
