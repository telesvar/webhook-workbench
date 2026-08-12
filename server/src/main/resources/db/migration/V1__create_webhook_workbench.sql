CREATE TABLE inboxes (
    id BINARY(16) NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    CONSTRAINT pk_inboxes PRIMARY KEY (id),
    CONSTRAINT uk_inboxes_slug UNIQUE (slug)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE webhook_events (
    id BINARY(16) NOT NULL,
    inbox_id BINARY(16) NOT NULL,
    http_method VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    content_type TEXT NOT NULL,
    headers JSON NOT NULL,
    body LONGTEXT NOT NULL,
    CONSTRAINT pk_webhook_events PRIMARY KEY (id),
    CONSTRAINT fk_webhook_events_inbox
        FOREIGN KEY (inbox_id) REFERENCES inboxes (id) ON DELETE CASCADE,
    -- Newest-first paging, retention pruning, and the SSE replay cursor all read this order.
    INDEX idx_webhook_events_inbox_id (inbox_id, id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE settings (
    id TINYINT NOT NULL,
    document JSON NOT NULL,
    CONSTRAINT pk_settings PRIMARY KEY (id),
    CONSTRAINT ck_settings_single_row CHECK (id = 1),
    CONSTRAINT ck_settings_document CHECK (JSON_TYPE(document) = 'OBJECT')
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

INSERT INTO settings (id, document) VALUES (1, JSON_OBJECT(
    'maskedFields', JSON_ARRAY(
        'authorization',
        'proxy-authorization',
        'cookie',
        'set-cookie',
        'x-api-key',
        'password',
        'secret',
        'token'
    )
));
