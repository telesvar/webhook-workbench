package dev.webhookworkbench.settings;

import java.util.List;
import java.util.Map;

import dev.webhookworkbench.support.IntegrationTest;
import org.junit.jupiter.api.Test;

import org.springframework.http.MediaType;

import static org.assertj.core.api.Assertions.assertThat;

class SettingsIT extends IntegrationTest {

    @Test
    void storesFieldNamesLowercasedAndDeduplicated() {
        client.get().uri("/api/settings").exchange()
                .expectStatus().isOk()
                .expectBody().jsonPath("$.maskedFields").isEqualTo(List.of("authorization", "cookie"));

        jdbc.sql("""
                        UPDATE settings
                        SET document = JSON_SET(document, '$.futureOption', TRUE)
                        WHERE id = 1
                        """)
                .update();

        // Normalized on the way in so matching is plain equality on every client.
        client.put().uri("/api/settings")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("maskedFields", List.of("  X-Signature ", "x-signature", "", "Secret")))
                .exchange()
                .expectStatus().isOk()
                .expectBody().jsonPath("$.maskedFields").isEqualTo(List.of("x-signature", "secret"));

        client.get().uri("/api/settings").exchange()
                .expectStatus().isOk()
                .expectBody().jsonPath("$.maskedFields").isEqualTo(List.of("x-signature", "secret"));
        assertThat(jdbc.sql("""
                        SELECT JSON_VALUE(document, '$.futureOption' RETURNING UNSIGNED)
                        FROM settings WHERE id = 1
                        """)
                .query(Integer.class)
                .single()).isEqualTo(1);
    }

    @Test
    void leavesKeysItDoesNotOwnAlone() {
        jdbc.sql("UPDATE settings SET document = JSON_SET(document, '$.futureKey', 'keep me') WHERE id = 1")
                .update();

        // Reading tolerates unknown keys. Writing only touches the path it owns.
        client.put().uri("/api/settings")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("maskedFields", List.of("token")))
                .exchange()
                .expectStatus().isOk();

        var document = jdbc.sql("SELECT document FROM settings WHERE id = 1").query(String.class).single();
        assertThat(document).contains("futureKey").contains("keep me").contains("token");
    }
}
