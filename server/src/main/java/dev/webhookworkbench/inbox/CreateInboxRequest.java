package dev.webhookworkbench.inbox;

import dev.webhookworkbench.api.WireType;

/// Null or blank name means the server generates one.
@WireType
public record CreateInboxRequest(String name) {
}
