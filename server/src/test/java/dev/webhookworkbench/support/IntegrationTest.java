package dev.webhookworkbench.support;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

import dev.webhookworkbench.event.CaptureReceipt;
import dev.webhookworkbench.event.EventDetail;
import dev.webhookworkbench.event.EventPage;
import dev.webhookworkbench.inbox.Inbox;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Timeout;
import org.testcontainers.mysql.MySQLContainer;
import org.testcontainers.utility.DockerImageName;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.client.RestTestClient;

import static org.assertj.core.api.Assertions.assertThat;

/// Real MySQL, a real servlet container, and helpers for tests that need either.
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                // Bind loopback, not 0.0.0.0. Port 0 on all interfaces can pick a port another
                // process already holds on loopback only. The client then hits that process
                // instead of Tomcat and the test fails with someone else's response.
                "server.address=127.0.0.1",
                "workbench.retention.max-events-per-inbox=3",
                "workbench.stream.heartbeat-interval=100ms",
                "workbench.capture.max-body-size=64KB"
        })
@AutoConfigureRestTestClient
@Timeout(60)
public abstract class IntegrationTest {

    /// Shared MySQL for the test JVM. Stopped on shutdown so the fork can exit cleanly.
    private static final MySQLContainer MYSQL = new MySQLContainer(
            DockerImageName.parse("mysql:9.7").asCompatibleSubstituteFor("mysql"))
            .withDatabaseName("webhook_workbench")
            .withUsername("webhook")
            .withPassword("webhook");

    /// One client for the suite. A per-call client leaves threads that keep the fork alive.
    private static final HttpClient HTTP = HttpClient.newHttpClient();

    static {
        MYSQL.start();
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            HTTP.close();
            MYSQL.stop();
        }));
    }

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> MYSQL.getJdbcUrl()
                + (MYSQL.getJdbcUrl().contains("?") ? "&" : "?")
                + "connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true&preserveInstants=true");
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
    }

    @Autowired
    protected RestTestClient client;

    @Autowired
    protected JdbcClient jdbc;

    @LocalServerPort
    protected int port;

    @BeforeEach
    void resetInstance() {
        jdbc.sql("DELETE FROM inboxes").update();
        jdbc.sql("""
                        UPDATE settings
                        SET document = JSON_OBJECT(
                            'maskedFields', JSON_ARRAY('authorization', 'cookie')
                        )
                        WHERE id = 1
                        """)
                .update();
    }

    protected Inbox createInbox(String name) {
        return client.post().uri("/api/inboxes")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("name", name))
                .exchange()
                .expectStatus().isCreated()
                .expectHeader().valueMatches("Location", "^/api/inboxes/.+")
                .returnResult(Inbox.class)
                .getResponseBody();
    }

    protected CaptureReceipt capture(Inbox inbox, String body, String contentType, Map<String, String> headers) {
        var spec = client.post().uri(inbox.endpoint()).contentType(MediaType.parseMediaType(contentType));
        headers.forEach(spec::header);
        return spec.body(body)
                .exchange()
                .expectStatus().isCreated()
                .expectHeader().valueMatches("Location", "^/api/events/.+")
                .returnResult(CaptureReceipt.class)
                .getResponseBody();
    }

    protected CaptureReceipt capture(Inbox inbox, String body) {
        return capture(inbox, body, MediaType.APPLICATION_JSON_VALUE, Map.of());
    }

    protected EventPage page(Inbox inbox, int page, int size) {
        return client.get().uri("/api/inboxes/{id}/events?page={page}&size={size}", inbox.id(), page, size)
                .exchange()
                .expectStatus().isOk()
                .returnResult(EventPage.class)
                .getResponseBody();
    }

    protected EventDetail detail(UUID eventId) {
        return client.get().uri("/api/events/{id}", eventId)
                .exchange()
                .expectStatus().isOk()
                .returnResult(EventDetail.class)
                .getResponseBody();
    }

    protected void expectProblem(String path, String body, String contentType, int status, String type) {
        client.post().uri(path)
                .contentType(MediaType.parseMediaType(contentType))
                .body(body)
                .exchange()
                .expectStatus().isEqualTo(status)
                .expectBody()
                .jsonPath("$.type").isEqualTo("urn:webhook-workbench:problem:" + type)
                .jsonPath("$.status").isEqualTo(status)
                .jsonPath("$.instance").isEqualTo(path);
    }

    protected URI uri(String path) {
        return URI.create("http://127.0.0.1:" + port + path);
    }

    protected BufferedReader openStream(Inbox inbox, String lastEventId) throws Exception {
        var builder = HttpRequest.newBuilder(uri("/api/inboxes/" + inbox.id() + "/stream"))
                .header("Accept", MediaType.TEXT_EVENT_STREAM_VALUE)
                .GET();
        if (lastEventId != null) {
            builder.header("Last-Event-ID", lastEventId);
        }
        var response = HTTP.send(builder.build(), HttpResponse.BodyHandlers.ofInputStream());
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.headers().firstValue("content-type").orElseThrow()).startsWith("text/event-stream");
        return new BufferedReader(new InputStreamReader(response.body(), StandardCharsets.UTF_8));
    }

    /// Waits for the line under test. Heartbeats interleave, so counting them races.
    protected static String readUntil(BufferedReader reader, String line, int occurrences) throws Exception {
        var text = new StringBuilder();
        var seen = 0;
        while (seen < occurrences) {
            var next = reader.readLine();
            if (next == null) {
                break;
            }
            text.append(next).append('\n');
            if (next.equals(line)) {
                seen++;
            }
        }
        return text.toString();
    }
}
