package dev.webhookworkbench.event;

import java.util.UUID;

import dev.webhookworkbench.inbox.InboxStore;
import dev.webhookworkbench.problem.WorkbenchException;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/inboxes")
final class EventStreamController {

    private final InboxStore inboxes;
    private final EventStreamRegistry streams;

    EventStreamController(InboxStore inboxes, EventStreamRegistry streams) {
        this.inboxes = inboxes;
        this.streams = streams;
    }

    @GetMapping(value = "/{inboxId}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    SseEmitter stream(
            @PathVariable UUID inboxId,
            @RequestHeader(name = "Last-Event-ID", required = false) String lastEventId) {
        if (!inboxes.exists(inboxId)) {
            throw WorkbenchException.inboxNotFound("No inbox exists for id '" + inboxId + "'.");
        }
        return streams.open(inboxId, lastEventId);
    }
}
