package dev.webhookworkbench.event;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

import dev.webhookworkbench.problem.WorkbenchException;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WebhookBodyReaderTest {

    private final WebhookBodyReader reader = new WebhookBodyReader("64KB");

    @Test
    void acceptsTheExactByteLimitAndRejectsOneByteMoreFromAnUnboundedStream() throws Exception {
        var exact = new byte[reader.maxBytes()];
        Arrays.fill(exact, (byte) 'x');
        var oversized = Arrays.copyOf(exact, exact.length + 1);

        assertThat(reader.read(new ByteArrayInputStream(exact))).hasSize(reader.maxBytes());
        assertThatThrownBy(() -> reader.read(new ByteArrayInputStream(oversized)))
                .isInstanceOf(WorkbenchException.class)
                .hasMessageContaining("64KB");
    }

    @Test
    void refusesAConfiguredSizeItCouldNotBuffer() {
        assertThatThrownBy(() -> new WebhookBodyReader("0B")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new WebhookBodyReader("4GB")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void capturesAnEmptyBodyRatherThanRejectingIt() throws Exception {
        assertThat(reader.read(new ByteArrayInputStream(new byte[0]))).isEmpty();
        assertThat(reader.read(new ByteArrayInputStream(" \r\n".getBytes(StandardCharsets.UTF_8))))
                .isEqualTo(" \r\n");
    }

    @Test
    void rejectsAnOversizedContentLengthWithoutReadingTheStream() throws Exception {
        var request = mock(HttpServletRequest.class);
        when(request.getContentLengthLong()).thenReturn((long) reader.maxBytes() + 1);

        assertThatThrownBy(() -> reader.read(request)).isInstanceOf(WorkbenchException.class);
        verify(request, never()).getInputStream();
    }
}
