package dev.webhookworkbench.event;

import java.time.Clock;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.aot.hint.annotation.RegisterReflectionForBinding;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.context.SmartLifecycle;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/// Open SSE emitters per inbox, with replay for reconnecting clients.
///
/// Delivery is at-least-once. An emitter is registered before its backlog is sent, so a capture
/// in that window can arrive twice and out of order. Clients dedupe by event id, so the registry
/// does not need to serialize fan-out.
///
/// [WebhookCapturedMessage] reaches Jackson as untyped event data, so AOT cannot infer it. Without
/// the reflection hint a native build can strip the accessors. A failed write is then easy to
/// mistake for a client disconnect, while JVM checks still pass. The smoke script watches for that.
@Component
@RegisterReflectionForBinding(WebhookCapturedMessage.class)
final class EventStreamRegistry implements SmartLifecycle {

    private static final Logger LOGGER = LoggerFactory.getLogger(EventStreamRegistry.class);

    private final Map<UUID, Set<SseEmitter>> emittersByInbox = new ConcurrentHashMap<>();

    private volatile boolean running;
    private final EventStore events;
    private final Clock clock;
    private final int retentionMaximum;

    EventStreamRegistry(
            EventStore events,
            Clock clock,
            @Value("${workbench.retention.max-events-per-inbox:500}") int retentionMaximum) {
        this.events = events;
        this.clock = clock;
        this.retentionMaximum = retentionMaximum;
    }

    SseEmitter open(UUID inboxId, String lastEventId) {
        var emitter = new SseEmitter(0L);
        emittersByInbox.computeIfAbsent(inboxId, ignored -> ConcurrentHashMap.newKeySet()).add(emitter);
        emitter.onCompletion(() -> remove(inboxId, emitter));
        emitter.onTimeout(() -> remove(inboxId, emitter));
        emitter.onError(ignored -> remove(inboxId, emitter));
        sendHeartbeat(inboxId, emitter);
        replay(inboxId, emitter, lastEventId);
        return emitter;
    }

    void publish(WebhookCaptured notification) {
        var inboxId = notification.event().inboxId();
        for (var emitter : emittersByInbox.getOrDefault(inboxId, Set.of())) {
            send(inboxId, emitter, WebhookCapturedMessage.of(notification));
        }
    }

    /// Closes every stream before the web server's graceful shutdown.
    ///
    /// Emitters have no timeout, so an open stream never looks idle. Closing them here means a
    /// shutdown with a browser attached does not wait out the full grace period.
    @Override
    public void stop() {
        running = false;
        var open = emittersByInbox.values().stream().flatMap(Set::stream).toList();
        emittersByInbox.clear();
        open.forEach(SseEmitter::complete);
    }

    /// Above the web server's shutdown phase so streams close first.
    @Override
    public int getPhase() {
        return WebServerApplicationContext.GRACEFUL_SHUTDOWN_PHASE + 1;
    }

    @Override
    public void start() {
        running = true;
    }

    @Override
    public boolean isRunning() {
        return running;
    }

    void reset(UUID inboxId) {
        for (var emitter : emittersByInbox.getOrDefault(inboxId, Set.of())) {
            sendReset(inboxId, emitter);
        }
    }

    @Scheduled(
            fixedRateString = "${workbench.stream.heartbeat-interval:15s}",
            initialDelayString = "${workbench.stream.heartbeat-interval:15s}")
    void heartbeat() {
        emittersByInbox.forEach((inboxId, emitters) -> emitters.forEach(emitter -> sendHeartbeat(inboxId, emitter)));
    }

    int activeCount(UUID inboxId) {
        return emittersByInbox.getOrDefault(inboxId, Set.of()).size();
    }

    // Cursor too far behind or not a UUID. Send reset so the client refetches.
    private void replay(UUID inboxId, SseEmitter emitter, String lastEventId) {
        if (lastEventId == null || lastEventId.isBlank()) {
            return;
        }
        var cursor = parse(lastEventId);
        if (cursor.isEmpty()) {
            sendReset(inboxId, emitter);
            return;
        }
        var missed = events.findAfter(inboxId, cursor.get(), retentionMaximum + 1);
        if (missed.size() > retentionMaximum) {
            sendReset(inboxId, emitter);
            return;
        }
        if (missed.isEmpty()) {
            return;
        }
        var eventCount = events.countByInbox(inboxId);
        for (var event : missed) {
            send(inboxId, emitter, WebhookCapturedMessage.of(new WebhookCaptured(event, eventCount)));
        }
    }

    private void send(UUID inboxId, SseEmitter emitter, WebhookCapturedMessage message) {
        try {
            emitter.send(SseEmitter.event()
                    .id(message.id().toString())
                    .name("webhook-captured")
                    .data(message));
        } catch (Exception exception) {
            disconnect(inboxId, emitter, exception);
        }
    }

    private void sendReset(UUID inboxId, SseEmitter emitter) {
        try {
            emitter.send(SseEmitter.event().name("reset").data(Map.of("at", clock.instant().toString())));
        } catch (Exception exception) {
            disconnect(inboxId, emitter, exception);
        }
    }

    private void sendHeartbeat(UUID inboxId, SseEmitter emitter) {
        try {
            emitter.send(SseEmitter.event()
                    .comment("keepalive")
                    .name("heartbeat")
                    .data(Map.of("at", clock.instant().toString())));
        } catch (Exception exception) {
            disconnect(inboxId, emitter, exception);
        }
    }

    private static java.util.Optional<UUID> parse(String id) {
        try {
            return java.util.Optional.of(UUID.fromString(id.strip()));
        } catch (IllegalArgumentException exception) {
            return java.util.Optional.empty();
        }
    }

    private void remove(UUID inboxId, SseEmitter emitter) {
        var emitters = emittersByInbox.get(inboxId);
        if (emitters == null) {
            return;
        }
        emitters.remove(emitter);
        if (emitters.isEmpty()) {
            emittersByInbox.remove(inboxId, emitters);
        }
    }

    private void disconnect(UUID inboxId, SseEmitter emitter, Exception exception) {
        LOGGER.debug("Removing disconnected event stream for inbox {}", inboxId, exception);
        remove(inboxId, emitter);
    }
}
