package dev.webhookworkbench.event;

import dev.webhookworkbench.inbox.InboxDeleted;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
final class EventStreamListener {

    private final EventStreamRegistry registry;

    EventStreamListener(EventStreamRegistry registry) {
        this.registry = registry;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    void afterCaptureCommit(WebhookCaptured notification) {
        registry.publish(notification);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    void afterDeleteCommit(EventsChanged change) {
        registry.reset(change.inboxId());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    void afterInboxDeleteCommit(InboxDeleted deletion) {
        registry.reset(deletion.inboxId());
    }
}
