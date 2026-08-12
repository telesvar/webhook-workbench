package dev.webhookworkbench.inbox;

import java.time.Instant;
import java.util.UUID;

import dev.webhookworkbench.api.WireType;

@WireType
public record Inbox(
        UUID id,
        String name,
        String slug,
        String endpoint,
        long eventCount,
        Instant createdAt) {

    /** The path a provider posts to. `WebhookReceiverController` maps the prefix. */
    public static String endpointFor(String slug) {
        return "/hooks/" + slug;
    }
}
