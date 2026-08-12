package dev.webhookworkbench.inbox;

import dev.webhookworkbench.problem.WorkbenchException;

final class InboxName {

    /// Column width of `inboxes.name`.
    static final int MAX_CODE_POINTS = 255;

    private InboxName() {
    }

    static String validateAndNormalize(String candidate) {
        if (candidate == null) {
            throw WorkbenchException.validation("Inbox name is required.");
        }
        var normalized = candidate.strip();
        var length = normalized.codePointCount(0, normalized.length());
        if (length == 0 || length > MAX_CODE_POINTS) {
            throw WorkbenchException.validation(
                    "Inbox name must contain between 1 and " + MAX_CODE_POINTS + " characters.");
        }
        if (normalized.codePoints().anyMatch(codePoint -> Character.getType(codePoint) == Character.CONTROL)) {
            throw WorkbenchException.validation("Inbox name must not contain control characters.");
        }
        return normalized;
    }
}
