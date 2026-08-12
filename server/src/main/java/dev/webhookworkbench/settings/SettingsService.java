package dev.webhookworkbench.settings;

import java.util.List;
import java.util.Locale;

import dev.webhookworkbench.problem.WorkbenchException;
import tools.jackson.databind.ObjectMapper;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class SettingsService {

    private final JdbcClient jdbc;
    private final ObjectMapper objectMapper;

    SettingsService(JdbcClient jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    Settings get() {
        var json = jdbc.sql("SELECT document FROM settings WHERE id = 1")
                .query(String.class)
                .single();
        return objectMapper.readValue(json, Settings.class);
    }

    @Transactional
    Settings replace(Settings settings) {
        var fields = normalize(settings.maskedFields());
        jdbc.sql("""
                        UPDATE settings
                        SET document = JSON_SET(
                            document,
                            '$.maskedFields',
                            JSON_EXTRACT(?, '$')
                        )
                        WHERE id = 1
                        """)
                .param(objectMapper.writeValueAsString(fields))
                .update();
        return new Settings(fields);
    }

    /// Lowercase and dedupe here so matching is plain equality everywhere else.
    private static List<String> normalize(List<String> requested) {
        if (requested == null) {
            throw WorkbenchException.validation("Masked fields are required.");
        }
        return requested.stream()
                .filter(field -> field != null)
                .map(field -> field.strip().toLowerCase(Locale.ROOT))
                .filter(field -> !field.isEmpty())
                .distinct()
                .toList();
    }
}
