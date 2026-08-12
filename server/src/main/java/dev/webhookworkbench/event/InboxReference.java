package dev.webhookworkbench.event;

import java.util.UUID;

import dev.webhookworkbench.api.WireType;

@WireType
public record InboxReference(UUID id, String name, String slug, String endpoint) {
}
