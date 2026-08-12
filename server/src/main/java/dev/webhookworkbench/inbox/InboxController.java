package dev.webhookworkbench.inbox;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(InboxController.PATH)
final class InboxController {

    static final String PATH = "/api/inboxes";

    private final InboxService service;

    InboxController(InboxService service) {
        this.service = service;
    }

    @PostMapping
    ResponseEntity<Inbox> create(@RequestBody(required = false) CreateInboxRequest request) {
        var inbox = service.create(request == null ? null : request.name());
        return ResponseEntity.created(URI.create(PATH + "/" + inbox.id())).body(inbox);
    }

    @GetMapping
    List<Inbox> findAll() {
        return service.findAll();
    }

    @GetMapping("/{inboxId}")
    Inbox find(@PathVariable UUID inboxId) {
        return service.find(inboxId);
    }

    @DeleteMapping("/{inboxId}")
    ResponseEntity<Void> delete(@PathVariable UUID inboxId) {
        service.delete(inboxId);
        return ResponseEntity.noContent().build();
    }
}
