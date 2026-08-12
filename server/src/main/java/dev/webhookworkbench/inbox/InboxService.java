package dev.webhookworkbench.inbox;

import java.time.Clock;
import java.util.List;
import java.util.UUID;

import dev.webhookworkbench.Uuid;
import dev.webhookworkbench.problem.WorkbenchException;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class InboxService {

    private static final int SLUG_ATTEMPTS = 3;

    private final InboxStore inboxes;
    private final SlugGenerator slugGenerator;
    private final ApplicationEventPublisher eventPublisher;
    private final Clock clock;

    InboxService(
            InboxStore inboxes,
            SlugGenerator slugGenerator,
            ApplicationEventPublisher eventPublisher,
            Clock clock) {
        this.inboxes = inboxes;
        this.slugGenerator = slugGenerator;
        this.eventPublisher = eventPublisher;
        this.clock = clock;
    }

    @Transactional
    Inbox create(String requestedName) {
        var name = InboxName.validateAndNormalize(requestedName);
        for (var attempt = 0; attempt < SLUG_ATTEMPTS; attempt++) {
            var id = Uuid.v7(clock.instant());
            var slug = slugGenerator.next(name);
            try {
                inboxes.insert(id, name, slug);
                return new Inbox(id, name, slug, Inbox.endpointFor(slug), 0, Uuid.instant(id));
            } catch (DuplicateKeyException ignored) {
                // A concurrent create may claim the suffix, so retry with a fresh one.
            }
        }
        throw WorkbenchException.slugExhausted();
    }

    @Transactional(readOnly = true)
    List<Inbox> findAll() {
        return inboxes.findAll();
    }

    @Transactional(readOnly = true)
    Inbox find(UUID id) {
        return inboxes.findById(id)
                .orElseThrow(() -> WorkbenchException.inboxNotFound("No inbox exists for id '" + id + "'."));
    }

    @Transactional
    void delete(UUID id) {
        inboxes.lockById(id)
                .orElseThrow(() -> WorkbenchException.inboxNotFound("No inbox exists for id '" + id + "'."));
        inboxes.delete(id);
        eventPublisher.publishEvent(new InboxDeleted(id));
    }
}
