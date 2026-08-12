package dev.webhookworkbench.event;

import java.time.Instant;
import java.util.UUID;

import dev.webhookworkbench.api.WireType;

@WireType
public record CaptureReceipt(UUID id, Instant receivedAt) {
}
