package dev.webhookworkbench.event;

import java.util.UUID;

import dev.webhookworkbench.inbox.InboxStore;
import dev.webhookworkbench.problem.WorkbenchException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class EventService {

    private final InboxStore inboxes;
    private final EventStore events;
    private final ApplicationEventPublisher eventPublisher;
    private final int maxPageSize;

    EventService(
            InboxStore inboxes,
            EventStore events,
            ApplicationEventPublisher eventPublisher,
            @Value("${workbench.query.max-page-size:500}") int maxPageSize) {
        this.inboxes = inboxes;
        this.events = events;
        this.eventPublisher = eventPublisher;
        this.maxPageSize = maxPageSize;
    }

    @Transactional(readOnly = true)
    EventPage findPage(UUID inboxId, int page, int size) {
        validatePage(page, size);
        if (!inboxes.exists(inboxId)) {
            throw WorkbenchException.inboxNotFound("No inbox exists for id '" + inboxId + "'.");
        }
        var totalElements = events.countByInbox(inboxId);
        var totalPages = totalElements == 0 ? 0 : Math.toIntExact((totalElements + size - 1) / size);
        var offset = Math.multiplyExact((long) page, size);
        var items = offset >= totalElements ? java.util.List.<EventSummary>of() : events.findPage(inboxId, size, offset);
        return new EventPage(items, page, size, totalElements, totalPages);
    }

    @Transactional(readOnly = true)
    EventDetail findDetail(UUID eventId) {
        return events.findDetail(eventId)
                .orElseThrow(() -> WorkbenchException.eventNotFound("No event exists for id '" + eventId + "'."));
    }

    @Transactional
    void delete(UUID eventId) {
        var inboxId = events.findInboxId(eventId)
                .orElseThrow(() -> WorkbenchException.eventNotFound("No event exists for id '" + eventId + "'."));
        inboxes.lockById(inboxId)
                .orElseThrow(() -> WorkbenchException.eventNotFound("No event exists for id '" + eventId + "'."));
        if (events.delete(eventId) == 0) {
            throw WorkbenchException.eventNotFound("No event exists for id '" + eventId + "'.");
        }
        eventPublisher.publishEvent(new EventsChanged(inboxId));
    }

    @Transactional
    void clear(UUID inboxId) {
        inboxes.lockById(inboxId)
                .orElseThrow(() -> WorkbenchException.inboxNotFound("No inbox exists for id '" + inboxId + "'."));
        events.deleteAll(inboxId);
        eventPublisher.publishEvent(new EventsChanged(inboxId));
    }

    void validatePage(int page, int size) {
        if (page < 0 || size < 1 || size > maxPageSize) {
            throw WorkbenchException.pagination(
                    "Page must be at least 0 and size must be between 1 and " + maxPageSize + ".");
        }
    }
}
