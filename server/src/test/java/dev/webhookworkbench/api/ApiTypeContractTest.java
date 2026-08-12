package dev.webhookworkbench.api;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ApiTypeContractTest {

    private static final Path GENERATED =
            Path.of("..", "web", "src", "api", "generated.ts").normalize();

    @Test
    @DisplayName("the committed TypeScript types match the @WireType records")
    void generatedTypesAreCurrent() throws IOException {
        var expected = TypeScriptDefinitions.render();

        if (Boolean.getBoolean("api.types.write")) {
            Files.createDirectories(GENERATED.getParent());
            Files.writeString(GENERATED, expected, StandardCharsets.UTF_8);
            return;
        }

        assertThat(GENERATED)
                .as("%s is generated from the @WireType records. Regenerate it with "
                        + "./scripts/generate-api-types.sh", GENERATED)
                .exists()
                .content(StandardCharsets.UTF_8)
                .isEqualTo(expected);
    }

    @Test
    @DisplayName("every type the web application consumes is on the wire contract")
    void contractCoversTheClientSurface() {
        assertThat(TypeScriptDefinitions.names())
                .contains(
                        "CaptureReceipt",
                        "CreateInboxRequest",
                        "EventDetail",
                        "EventPage",
                        "EventSummary",
                        "Inbox",
                        "InboxReference",
                        "WebhookCapturedMessage");
    }
}
