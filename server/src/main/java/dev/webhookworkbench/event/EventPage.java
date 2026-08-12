package dev.webhookworkbench.event;

import java.util.List;

import dev.webhookworkbench.api.WireType;

@WireType
public record EventPage(
        List<EventSummary> items,
        int page,
        int size,
        long totalElements,
        int totalPages) {
}
