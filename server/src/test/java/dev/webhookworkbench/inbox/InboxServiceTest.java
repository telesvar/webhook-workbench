package dev.webhookworkbench.inbox;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import dev.webhookworkbench.problem.WorkbenchException;
import org.junit.jupiter.api.Test;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DuplicateKeyException;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeast;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

/// A slug collision cannot be forced through the API, since the suffix is random. This is where
/// the retry path is exercised.
class InboxServiceTest {

    @Test
    void retriesACollidingSlugAndEventuallyReportsAConflict() {
        var inboxes = mock(InboxStore.class);
        doThrow(new DuplicateKeyException("collision"))
                .when(inboxes).insert(any(), eq("Payments"), eq("payments-0001"));
        var service = new InboxService(
                inboxes,
                new SlugGenerator(() -> 1),
                mock(ApplicationEventPublisher.class),
                Clock.fixed(Instant.parse("2026-08-05T10:30:00Z"), ZoneOffset.UTC));

        // A conflict the caller can act on, not the driver's duplicate-key exception.
        assertThatThrownBy(() -> service.create("Payments"))
                .isInstanceOf(WorkbenchException.class)
                .hasMessageContaining("unique endpoint");
        verify(inboxes, atLeast(2)).insert(any(), eq("Payments"), eq("payments-0001"));
    }
}
