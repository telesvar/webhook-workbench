package dev.webhookworkbench.inbox;

import java.util.Map;

import dev.webhookworkbench.support.IntegrationTest;
import org.junit.jupiter.api.Test;

import org.springframework.http.MediaType;

import static org.assertj.core.api.Assertions.assertThat;

class InboxApiIT extends IntegrationTest {

    @Test
    void createsAnAddressableInboxFromANameAndReadsItBack() {
        var created = createInbox("  Payment Events  ");

        assertThat(created.id().version()).isEqualTo(7);
        assertThat(created.name()).isEqualTo("Payment Events");
        assertThat(created.slug()).matches("payment-events-[0-9a-f]{4}");
        assertThat(created.endpoint()).isEqualTo("/hooks/" + created.slug());
        assertThat(created.eventCount()).isZero();
        assertThat(created.createdAt().toString()).endsWith("Z");

        client.get().uri("/api/inboxes/{id}", created.id()).exchange()
                .expectStatus().isOk()
                .expectBody(Inbox.class).isEqualTo(created);

        var listed = client.get().uri("/api/inboxes").exchange()
                .expectStatus().isOk()
                .returnResult(Inbox[].class)
                .getResponseBody();
        assertThat(listed).containsExactly(created);
    }

    @Test
    void refusesANameThatIsNotOne() {
        client.post().uri("/api/inboxes")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("name", " \n "))
                .exchange()
                .expectStatus().isBadRequest()
                .expectBody()
                .jsonPath("$.type").isEqualTo("urn:webhook-workbench:problem:validation")
                .jsonPath("$.instance").isEqualTo("/api/inboxes");

        client.post().uri("/api/inboxes")
                .contentType(MediaType.APPLICATION_JSON)
                .body("null")
                .exchange()
                .expectStatus().isBadRequest()
                .expectBody()
                .jsonPath("$.type").isEqualTo("urn:webhook-workbench:problem:validation");
    }

    @Test
    void deletingAnInboxTakesItsEventsWithIt() {
        var inbox = createInbox("Lifecycle");
        capture(inbox, "{\"n\":1}");

        client.delete().uri("/api/inboxes/{id}", inbox.id()).exchange().expectStatus().isNoContent();

        assertThat(jdbc.sql("SELECT COUNT(*) FROM webhook_events").query(Long.class).single()).isZero();
        client.get().uri("/api/inboxes/{id}", inbox.id()).exchange().expectStatus().isNotFound();
    }
}
