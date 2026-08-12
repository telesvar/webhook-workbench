package dev.webhookworkbench.event;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import dev.webhookworkbench.api.WireType;

@WireType
public record EventDetail(
        UUID id,
        UUID inboxId,
        String httpMethod,
        String contentType,
        Instant receivedAt,
        InboxReference inbox,
        Map<String, List<String>> headers,
        String body) {
}
