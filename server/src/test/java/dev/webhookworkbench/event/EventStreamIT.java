package dev.webhookworkbench.event;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import dev.webhookworkbench.support.IntegrationTest;
import org.awaitility.Awaitility;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

class EventStreamIT extends IntegrationTest {

    @Autowired
    ApplicationEventPublisher eventPublisher;

    @Autowired
    PlatformTransactionManager transactionManager;

    @MockitoSpyBean
    EventStreamRegistry streams;

    @Test
    void greetsAClientThenDeliversCapturesAsTheyLand() throws Exception {
        var inbox = createInbox("Streaming");

        try (var reader = openStream(inbox, null);
                var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var greeting = executor.submit(() -> readUntil(reader, "event:heartbeat", 2));
            assertThat(greeting.get(5, TimeUnit.SECONDS)).contains(":keepalive").contains("event:heartbeat");
            assertThat(streams.activeCount(inbox.id())).isOne();

            // Read to the blank line that ends the frame so the assertion sees the data too.
            var delivery = executor.submit(
                    () -> readUntil(reader, "event:webhook-captured", 1) + readUntil(reader, "", 1));
            var receipt = capture(inbox, "{\"live\":true}");
            assertThat(delivery.get(5, TimeUnit.SECONDS))
                    .contains("id:" + receipt.id())
                    .contains("\"inboxId\":\"" + inbox.id() + "\"")
                    .contains("\"httpMethod\":\"POST\"")
                    .contains("\"eventCount\":1")
                    .doesNotContain("\"event\":{");
        }

        Awaitility.await().atMost(Duration.ofSeconds(5))
                .untilAsserted(() -> assertThat(streams.activeCount(inbox.id())).isZero());
    }

    @Test
    void replaysWhatAReconnectingClientMissed() throws Exception {
        var inbox = createInbox("Reconnect");
        var first = capture(inbox, "{\"n\":1}");
        var second = capture(inbox, "{\"n\":2}");
        var third = capture(inbox, "{\"n\":3}");

        try (var reader = openStream(inbox, first.id().toString())) {
            var wire = readUntil(reader, "event:webhook-captured", 2);
            assertThat(wire.indexOf(second.id().toString())).isLessThan(wire.indexOf(third.id().toString()));
            assertThat(wire).doesNotContain(first.id().toString());
        }
    }

    @Test
    void replaysFromACursorThatHasBeenPrunedAway() throws Exception {
        var inbox = createInbox("Pruned");
        var first = capture(inbox, "{\"n\":1}");
        var second = capture(inbox, "{\"n\":2}");
        client.delete().uri("/api/events/{id}", first.id()).exchange().expectStatus().isNoContent();

        // The cursor sorts by creation time on its own, so it still places the client after that
        // event is gone.
        try (var reader = openStream(inbox, first.id().toString())) {
            assertThat(readUntil(reader, "event:webhook-captured", 1))
                    .contains(second.id().toString());
        }
    }

    @Test
    void asksForARefetchWhenTheCursorIsNotAnId() throws Exception {
        var inbox = createInbox("Nonsense");
        capture(inbox, "{\"n\":1}");

        try (var reader = openStream(inbox, "not-a-uuid")) {
            assertThat(readUntil(reader, "event:reset", 1)).contains("event:reset");
        }
    }

    @Test
    void asksForARefetchWhenSomebodyElseDeletesWhatIsBeingWatched() throws Exception {
        var inbox = createInbox("Watched");
        var event = capture(inbox, "{\"n\":1}");

        try (var reader = openStream(inbox, null)) {
            readUntil(reader, "event:heartbeat", 1);
            client.delete().uri("/api/events/{id}", event.id()).exchange().expectStatus().isNoContent();
            assertThat(readUntil(reader, "event:reset", 1)).contains("event:reset");
        }

        try (var reader = openStream(inbox, null)) {
            readUntil(reader, "event:heartbeat", 1);
            client.delete().uri("/api/inboxes/{id}", inbox.id()).exchange().expectStatus().isNoContent();
            assertThat(readUntil(reader, "event:reset", 1)).contains("event:reset");
        }
    }

    @Test
    void publishesToClientsOnlyAfterTheCaptureCommits() {
        reset(streams);
        var notification = new WebhookCaptured(
                new EventSummary(
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        "POST",
                        "application/json",
                        Instant.parse("2026-08-05T10:30:00Z")),
                1);
        var transaction = new TransactionTemplate(transactionManager);

        transaction.executeWithoutResult(status -> {
            eventPublisher.publishEvent(notification);
            verify(streams, never()).publish(any());
            status.setRollbackOnly();
        });
        // A rolled-back capture should not have been announced to a browser.
        verify(streams, never()).publish(any());

        transaction.executeWithoutResult(status -> {
            eventPublisher.publishEvent(notification);
            verify(streams, never()).publish(any());
        });
        verify(streams, times(1)).publish(notification);
    }
}
