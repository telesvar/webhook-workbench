package dev.webhookworkbench.access;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public final class AccessToken {

    private final byte[] expected;

    AccessToken(@Value("${workbench.access-token:}") String token) {
        this.expected = token == null || token.isBlank()
                ? null
                : token.strip().getBytes(StandardCharsets.UTF_8);
    }

    public boolean required() {
        return expected != null;
    }

    /// Constant-time compare so a wrong token does not leak through timing.
    public boolean matches(String candidate) {
        if (expected == null) {
            return true;
        }
        if (candidate == null) {
            return false;
        }
        return MessageDigest.isEqual(expected, candidate.strip().getBytes(StandardCharsets.UTF_8));
    }
}
