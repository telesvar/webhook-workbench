package dev.webhookworkbench.inbox;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import dev.webhookworkbench.Uuid;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

@Component
public final class InboxStore {

    private static final RowMapper<Inbox> INBOX_ROW_MAPPER = (resultSet, rowNumber) -> new Inbox(
            Uuid.read(resultSet, "id"),
            resultSet.getString("name"),
            resultSet.getString("slug"),
            Inbox.endpointFor(resultSet.getString("slug")),
            resultSet.getLong("event_count"),
            Uuid.instant(Uuid.read(resultSet, "id")));

    private static final String SELECT_ID = "SELECT id FROM inboxes ";

    private final JdbcClient jdbc;

    InboxStore(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<Inbox> findAll() {
        return jdbc.sql("""
                        SELECT i.id, i.name, i.slug,
                               (SELECT COUNT(*) FROM webhook_events e WHERE e.inbox_id = i.id) AS event_count
                        FROM inboxes i
                        ORDER BY i.id DESC
                        """)
                .query(INBOX_ROW_MAPPER)
                .list();
    }

    public Optional<Inbox> findById(UUID id) {
        return jdbc.sql("""
                        SELECT i.id, i.name, i.slug,
                               (SELECT COUNT(*) FROM webhook_events e WHERE e.inbox_id = i.id) AS event_count
                        FROM inboxes i
                        WHERE i.id = :id
                        """)
                .param("id", Uuid.bytes(id))
                .query(INBOX_ROW_MAPPER)
                .optional();
    }

    public boolean exists(UUID id) {
        return id(SELECT_ID + "WHERE id = :value", Uuid.bytes(id)).isPresent();
    }

    /// Row lock that serializes capture, retention, and deletion. Any transaction that touches
    /// an inbox's events takes this first, and always in that order.
    public Optional<UUID> lockById(UUID id) {
        return id(SELECT_ID + "WHERE id = :value FOR UPDATE", Uuid.bytes(id));
    }

    public Optional<UUID> lockBySlug(String slug) {
        return id(SELECT_ID + "WHERE slug = :value FOR UPDATE", slug);
    }

    public void insert(UUID id, String name, String slug) {
        jdbc.sql("INSERT INTO inboxes (id, name, slug) VALUES (:id, :name, :slug)")
                .param("id", Uuid.bytes(id))
                .param("name", name)
                .param("slug", slug)
                .update();
    }

    public int delete(UUID id) {
        return jdbc.sql("DELETE FROM inboxes WHERE id = :id")
                .param("id", Uuid.bytes(id))
                .update();
    }

    private Optional<UUID> id(String sql, Object value) {
        return jdbc.sql(sql)
                .param("value", value)
                .query((resultSet, rowNumber) -> Uuid.read(resultSet, "id"))
                .optional();
    }
}
