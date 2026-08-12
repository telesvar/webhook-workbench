package dev.webhookworkbench.event;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import jakarta.servlet.http.HttpServletRequest;

import dev.webhookworkbench.problem.WorkbenchException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.unit.DataSize;

@Component
final class WebhookBodyReader {

    private final int maxBytes;
    private final String configured;

    /// Bodies are buffered in memory, so this caps how much one request may hold.
    WebhookBodyReader(@Value("${workbench.capture.max-body-size:8MB}") String maxBodySize) {
        var size = DataSize.parse(maxBodySize).toBytes();
        if (size < 1 || size > Integer.MAX_VALUE - 8) {
            throw new IllegalArgumentException(
                    "workbench.capture.max-body-size must be between 1 byte and 2 GB, was " + maxBodySize);
        }
        this.maxBytes = (int) size;
        this.configured = maxBodySize;
    }

    /// Empty bodies are captured, not rejected. Invalid UTF-8 becomes replacement characters so
    /// binary bodies stay visible instead of failing the capture.
    String read(HttpServletRequest request) throws IOException {
        if (request.getContentLengthLong() > maxBytes) {
            throw WorkbenchException.payloadTooLarge(configured);
        }
        return read(request.getInputStream());
    }

    String read(InputStream input) throws IOException {
        var bytes = input.readNBytes(maxBytes + 1);
        if (bytes.length > maxBytes) {
            throw WorkbenchException.payloadTooLarge(configured);
        }
        return new String(bytes, StandardCharsets.UTF_8);
    }

    int maxBytes() {
        return maxBytes;
    }
}
