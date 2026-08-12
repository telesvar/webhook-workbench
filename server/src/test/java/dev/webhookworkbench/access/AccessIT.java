package dev.webhookworkbench.access;

import dev.webhookworkbench.support.IntegrationTest;
import org.junit.jupiter.api.Test;

import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;

/// [AccessTokenFilterTest] covers which credentials count. This checks that Spring registers
/// the filter on real paths, and that webhook delivery stays open while `/api` closes.
@TestPropertySource(properties = "workbench.access-token=integration-secret")
class AccessIT extends IntegrationTest {

    @Test
    void guardsTheApiAndLeavesDeliveryOpen() {
        client.get().uri("/api/inboxes").exchange()
                .expectStatus().isUnauthorized()
                .expectHeader().contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .expectBody().jsonPath("$.type").isEqualTo("urn:webhook-workbench:problem:unauthorized");

        client.get().uri("/api/inboxes").header("Authorization", "Bearer integration-secret").exchange()
                .expectStatus().isOk();
        client.get().uri("/api/inboxes").cookie(AccessTokenFilter.COOKIE_NAME, "integration-secret").exchange()
                .expectStatus().isOk();

        client.get().uri("/api/session").exchange()
                .expectStatus().isOk()
                .expectBody().jsonPath("$.authenticationRequired").isEqualTo(true);

        // Senders have no token, so an unknown slug is a 404 rather than a 401.
        client.post().uri("/hooks/no-such-inbox")
                .contentType(MediaType.APPLICATION_JSON)
                .body("{}")
                .exchange()
                .expectStatus().isNotFound();
    }
}
