package dev.webhookworkbench.event;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
final class EventController {

    /** Where a capture receipt points. Kept beside the mapping that serves it. */
    static String pathFor(UUID eventId) {
        return "/api/events/" + eventId;
    }

    private final EventService service;

    EventController(EventService service) {
        this.service = service;
    }

    @GetMapping("/inboxes/{inboxId}/events")
    EventPage findPage(
            @PathVariable UUID inboxId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return service.findPage(inboxId, page, size);
    }

    @DeleteMapping("/inboxes/{inboxId}/events")
    ResponseEntity<Void> clear(@PathVariable UUID inboxId) {
        service.clear(inboxId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/events/{eventId}")
    EventDetail findDetail(@PathVariable UUID eventId) {
        return service.findDetail(eventId);
    }

    @DeleteMapping("/events/{eventId}")
    ResponseEntity<Void> delete(@PathVariable UUID eventId) {
        service.delete(eventId);
        return ResponseEntity.noContent().build();
    }
}
