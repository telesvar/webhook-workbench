package dev.webhookworkbench.event;

/// Published inside the capture transaction and consumed only after commit.
record WebhookCaptured(EventSummary event, long eventCount) {
}
