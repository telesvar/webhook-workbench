package dev.webhookworkbench.event;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import dev.webhookworkbench.inbox.Inbox;
import dev.webhookworkbench.support.IntegrationTest;
import org.junit.jupiter.api.Test;

import org.springframework.http.MediaType;

import static org.assertj.core.api.Assertions.assertThat;

class CaptureIT extends IntegrationTest {

    @Test
    void acceptsEveryShapeASenderMightDeliver() {
        var inbox = createInbox("Anything");

        var form = capture(inbox, "channel=%23general&text=hi", "application/x-www-form-urlencoded", Map.of());
        assertThat(detail(form.id()).body()).isEqualTo("channel=%23general&text=hi");
        assertThat(detail(form.id()).contentType()).isEqualTo("application/x-www-form-urlencoded");

        var broken = capture(inbox, "{not json", "application/json", Map.of());
        assertThat(detail(broken.id()).body()).isEqualTo("{not json");

        var xml = capture(inbox, "<Response><Say>hi</Say></Response>", "text/xml", Map.of());
        assertThat(detail(xml.id()).body()).startsWith("<Response>");
    }

    @Test
    void storesHeadersAndBodyExactlyAsSent() {
        var inbox = createInbox("Verbatim");

        var receipt = capture(
                inbox,
                "null",
                "application/json; charset=UTF-8",
                Map.of(
                        "Authorization", "Bearer super-secret",
                        "Cookie", "session=super-secret",
                        "X-Provider-Signature", "sha256=abc"));

        var detail = detail(receipt.id());
        assertThat(receipt.id().version()).isEqualTo(7);
        assertThat(detail.body()).isEqualTo("null");
        assertThat(detail.contentType()).isEqualTo("application/json;charset=UTF-8");
        // Capture stores credentials as sent. Masking is a display concern later.
        assertThat(header(detail, "authorization")).containsExactly("Bearer super-secret");
        assertThat(header(detail, "cookie")).containsExactly("session=super-secret");
        assertThat(header(detail, "x-provider-signature")).containsExactly("sha256=abc");
        // Receipt and stored event share the same id-derived time.
        assertThat(detail.receivedAt()).isEqualTo(receipt.receivedAt());
        assertThat(detail.receivedAt().toString()).endsWith("Z");
    }

    @Test
    void capturesARequestWithNoBodyAndNoContentType() {
        var inbox = createInbox("Bare");

        var receipt = client.put().uri(inbox.endpoint()).exchange()
                .expectStatus().isCreated()
                .returnResult(CaptureReceipt.class)
                .getResponseBody();

        var detail = detail(receipt.id());
        assertThat(detail.httpMethod()).isEqualTo("PUT");
        assertThat(detail.body()).isEmpty();
        assertThat(detail.contentType()).isEmpty();
    }

    @Test
    void answersASenderThatWillNotAcceptJson() {
        var inbox = createInbox("Negotiation");

        // Content negotiation would 406 after store, and the sender would retry the same webhook.
        client.post().uri(inbox.endpoint())
                .contentType(MediaType.APPLICATION_JSON)
                .header("Accept", "text/plain")
                .body("{\"paid\":true}")
                .exchange()
                .expectStatus().isCreated();

        assertThat(page(inbox, 0, 50).totalElements()).isEqualTo(1);
    }

    @Test
    void pagesNewestFirstAndStopsPastTheEnd() {
        var inbox = createInbox("Paging");
        capture(inbox, "{\"n\":1}");
        capture(inbox, "{\"n\":2}");
        var newest = capture(inbox, "{\"n\":3}");

        var page = page(inbox, 0, 2);
        assertThat(page.totalElements()).isEqualTo(3);
        assertThat(page.totalPages()).isEqualTo(2);
        assertThat(page.items()).hasSize(2).isSortedAccordingTo(newestFirst());
        assertThat(page.items().getFirst().id()).isEqualTo(newest.id());

        var beyond = page(inbox, 99, 2);
        assertThat(beyond.items()).isEmpty();
        assertThat(beyond.totalElements()).isEqualTo(3);
    }

    @Test
    void serializesConcurrentCapturesAndKeepsOnlyTheNewestPastRetention() throws Exception {
        var inbox = createInbox("Concurrency");

        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var requests = new ArrayList<Future<Integer>>();
            for (var index = 0; index < 12; index++) {
                var sequence = index;
                requests.add(executor.submit(() -> client.post().uri(inbox.endpoint())
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"sequence\":" + sequence + "}")
                        .exchange()
                        .returnResult()
                        .getStatus()
                        .value()));
            }
            for (var request : requests) {
                assertThat(request.get(20, TimeUnit.SECONDS)).isEqualTo(201);
            }
        }

        // Retention is three here. The row lock stops twelve concurrent captures from each
        // pruning against a stale count.
        var page = page(inbox, 0, 50);
        assertThat(page.totalElements()).isEqualTo(3);
        assertThat(page.items()).hasSize(3).isSortedAccordingTo(newestFirst());
        var refreshed = client.get().uri("/api/inboxes/{id}", inbox.id()).exchange()
                .returnResult(Inbox.class).getResponseBody();
        assertThat(refreshed.eventCount()).isEqualTo(3);
    }

    @Test
    void deletesOneEventAndClearsTheRest() {
        var inbox = createInbox("Deletion");
        var first = capture(inbox, "{\"n\":1}");
        capture(inbox, "{\"n\":2}");

        client.delete().uri("/api/events/{id}", first.id()).exchange().expectStatus().isNoContent();
        client.get().uri("/api/events/{id}", first.id()).exchange()
                .expectStatus().isNotFound()
                .expectBody().jsonPath("$.type").isEqualTo("urn:webhook-workbench:problem:event-not-found");

        client.delete().uri("/api/inboxes/{id}/events", inbox.id()).exchange().expectStatus().isNoContent();
        assertThat(page(inbox, 0, 50).items()).isEmpty();
    }

    @Test
    void answersEveryFailureWithAProblemThatLeaksNothing() {
        var inbox = createInbox("Problems");

        expectProblem("/hooks/unknown-inbox", "{}", "application/json", 404, "inbox-not-found");
        expectProblem(inbox.endpoint(), " ".repeat(64 * 1024 + 1), "application/json", 413, "payload-too-large");

        expectPagination(inbox, "page=-1&size=50");
        expectPagination(inbox, "page=0&size=501");
        expectPagination(inbox, "page=nope");

        client.get().uri("/api/not-a-route").exchange()
                .expectStatus().isNotFound()
                .expectBody()
                .jsonPath("$.type").isEqualTo("urn:webhook-workbench:problem:resource-not-found")
                .jsonPath("$.instance").isEqualTo("/api/not-a-route");
        client.get().uri("/assets/not-present.js").exchange()
                .expectStatus().isNotFound()
                .expectBody()
                .jsonPath("$.type").isEqualTo("urn:webhook-workbench:problem:resource-not-found");
    }

    private void expectPagination(Inbox inbox, String query) {
        client.get().uri("/api/inboxes/{id}/events?" + query, inbox.id()).exchange()
                .expectStatus().isBadRequest()
                .expectBody().jsonPath("$.type").isEqualTo("urn:webhook-workbench:problem:pagination");
    }

    /// UUIDv7 sorts by creation time, so newest first is reverse id order.
    private static Comparator<EventSummary> newestFirst() {
        return Comparator.comparing(EventSummary::id).reversed();
    }

    private static List<String> header(EventDetail detail, String lowerCaseName) {
        return detail.headers().entrySet().stream()
                .filter(entry -> entry.getKey().equalsIgnoreCase(lowerCaseName))
                .findFirst()
                .orElseThrow()
                .getValue();
    }
}
