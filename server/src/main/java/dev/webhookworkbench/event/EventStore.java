package dev.webhookworkbench.event;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import dev.webhookworkbench.Uuid;
import dev.webhookworkbench.inbox.Inbox;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

@Component
final class EventStore {

    private static final TypeReference<LinkedHashMap<String, List<String>>> HEADERS_TYPE = new TypeReference<>() { };

    private final JdbcClient jdbc;
    private final ObjectMapper objectMapper;
    private final RowMapper<EventSummary> summaryMapper = (resultSet, rowNumber) -> summary(resultSet);

    EventStore(JdbcClient jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    void insert(
            UUID id,
            UUID inboxId,
            String httpMethod,
            String contentType,
            String headersJson,
            String body) {
        jdbc.sql("""
                        INSERT INTO webhook_events
                            (id, inbox_id, http_method, content_type, headers, body)
                        VALUES
                            (:id, :inboxId, :httpMethod, :contentType, :headers, :body)
                        """)
                .param("id", Uuid.bytes(id))
                .param("inboxId", Uuid.bytes(inboxId))
                .param("httpMethod", httpMethod)
                .param("contentType", contentType)
                .param("headers", headersJson)
                .param("body", body)
                .update();
    }

    long countByInbox(UUID inboxId) {
        return jdbc.sql("SELECT COUNT(*) FROM webhook_events WHERE inbox_id = :inboxId")
                .param("inboxId", Uuid.bytes(inboxId))
                .query(Long.class)
                .single();
    }

    int deleteOldest(UUID inboxId, int count) {
        if (count <= 0) {
            return 0;
        }
        return jdbc.sql("""
                        DELETE FROM webhook_events
                        WHERE id IN (
                            SELECT id FROM (
                                SELECT id
                                FROM webhook_events
                                WHERE inbox_id = :inboxId
                                ORDER BY id ASC
                                LIMIT :count
                            ) AS oldest_events
                        )
                        """)
                .param("inboxId", Uuid.bytes(inboxId))
                .param("count", count)
                .update();
    }

    List<EventSummary> findPage(UUID inboxId, int size, long offset) {
        return jdbc.sql("""
                        SELECT id, inbox_id, http_method, content_type
                        FROM webhook_events
                        WHERE inbox_id = :inboxId
                        ORDER BY id DESC
                        LIMIT :size OFFSET :offset
                        """)
                .param("inboxId", Uuid.bytes(inboxId))
                .param("size", size)
                .param("offset", offset)
                .query(summaryMapper)
                .list();
    }

    Optional<EventDetail> findDetail(UUID eventId) {
        return jdbc.sql("""
                        SELECT e.id, e.inbox_id, e.http_method, e.content_type,
                               CAST(e.headers AS CHAR) AS headers_json,
                               e.body,
                               i.name AS inbox_name, i.slug AS inbox_slug
                        FROM webhook_events e
                        JOIN inboxes i ON i.id = e.inbox_id
                        WHERE e.id = :eventId
                        """)
                .param("eventId", Uuid.bytes(eventId))
                .query(this::detail)
                .optional();
    }

    /// Keyset page on id (creation order), so the cursor needs no lookup.
    List<EventSummary> findAfter(UUID inboxId, UUID cursor, int limit) {
        return jdbc.sql("""
                        SELECT id, inbox_id, http_method, content_type
                        FROM webhook_events
                        WHERE inbox_id = :inboxId AND id > :cursor
                        ORDER BY id ASC
                        LIMIT :limit
                        """)
                .param("inboxId", Uuid.bytes(inboxId))
                .param("cursor", Uuid.bytes(cursor))
                .param("limit", limit)
                .query(summaryMapper)
                .list();
    }

    Optional<UUID> findInboxId(UUID eventId) {
        return jdbc.sql("SELECT inbox_id FROM webhook_events WHERE id = :eventId")
                .param("eventId", Uuid.bytes(eventId))
                .query((resultSet, rowNumber) -> Uuid.read(resultSet, "inbox_id"))
                .optional();
    }

    int delete(UUID eventId) {
        return jdbc.sql("DELETE FROM webhook_events WHERE id = :eventId")
                .param("eventId", Uuid.bytes(eventId))
                .update();
    }

    int deleteAll(UUID inboxId) {
        return jdbc.sql("DELETE FROM webhook_events WHERE inbox_id = :inboxId")
                .param("inboxId", Uuid.bytes(inboxId))
                .update();
    }

    private EventDetail detail(ResultSet resultSet, int rowNumber) throws SQLException {
        var event = summary(resultSet);
        Map<String, List<String>> headers = objectMapper.readValue(resultSet.getString("headers_json"), HEADERS_TYPE);
        return new EventDetail(
                event.id(),
                event.inboxId(),
                event.httpMethod(),
                event.contentType(),
                event.receivedAt(),
                inboxReference(event.inboxId(), resultSet),
                Map.copyOf(headers),
                resultSet.getString("body"));
    }

    private static InboxReference inboxReference(UUID inboxId, ResultSet resultSet) throws SQLException {
        var slug = resultSet.getString("inbox_slug");
        return new InboxReference(inboxId, resultSet.getString("inbox_name"), slug, Inbox.endpointFor(slug));
    }

    private static EventSummary summary(ResultSet resultSet) throws SQLException {
        return new EventSummary(
                Uuid.read(resultSet, "id"),
                Uuid.read(resultSet, "inbox_id"),
                resultSet.getString("http_method"),
                resultSet.getString("content_type"),
                Uuid.instant(Uuid.read(resultSet, "id")));
    }
}
