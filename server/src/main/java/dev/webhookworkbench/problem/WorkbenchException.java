package dev.webhookworkbench.problem;

import org.springframework.http.HttpStatus;

/// Expected application failure that is safe to show an HTTP client.
public final class WorkbenchException extends RuntimeException {

    private final String problemType;
    private final String title;
    private final HttpStatus status;

    private WorkbenchException(String problemType, String title, HttpStatus status, String detail) {
        super(detail);
        this.problemType = problemType;
        this.title = title;
        this.status = status;
    }

    public static WorkbenchException validation(String detail) {
        return new WorkbenchException("validation", "Validation failed", HttpStatus.BAD_REQUEST, detail);
    }

    public static WorkbenchException malformedJson(String detail) {
        return new WorkbenchException("malformed-json", "Malformed JSON", HttpStatus.BAD_REQUEST, detail);
    }

    public static WorkbenchException pagination(String detail) {
        return new WorkbenchException("pagination", "Invalid pagination", HttpStatus.BAD_REQUEST, detail);
    }

    public static WorkbenchException inboxNotFound(String detail) {
        return new WorkbenchException("inbox-not-found", "Inbox not found", HttpStatus.NOT_FOUND, detail);
    }

    public static WorkbenchException eventNotFound(String detail) {
        return new WorkbenchException("event-not-found", "Event not found", HttpStatus.NOT_FOUND, detail);
    }

    public static WorkbenchException payloadTooLarge(String limit) {
        return new WorkbenchException(
                "payload-too-large",
                "Payload too large",
                HttpStatus.CONTENT_TOO_LARGE,
                "Webhook bodies must not exceed " + limit + ".");
    }

    public static WorkbenchException slugExhausted() {
        return new WorkbenchException(
                "slug-exhausted",
                "Inbox could not be created",
                HttpStatus.CONFLICT,
                "A unique endpoint could not be allocated. Try creating the inbox again.");
    }

    public String problemType() {
        return problemType;
    }

    public String title() {
        return title;
    }

    public HttpStatus status() {
        return status;
    }
}
