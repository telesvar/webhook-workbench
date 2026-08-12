package dev.webhookworkbench.inbox;

import java.text.Normalizer;
import java.util.Locale;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.IntSupplier;

import org.springframework.stereotype.Component;

/// Turns an inbox name into the path you paste into a provider dashboard.
///
/// The short suffix keeps same-named inboxes apart without a long random tail.
@Component
final class SlugGenerator {

    /// `inboxes.slug` width minus `-` and the four-hex suffix.
    private static final int MAX_BASE_LENGTH = 255 - 5;

    private final IntSupplier randomSuffix;

    SlugGenerator() {
        this(() -> ThreadLocalRandom.current().nextInt(0x1_0000));
    }

    SlugGenerator(IntSupplier randomSuffix) {
        this.randomSuffix = randomSuffix;
    }

    String next(String name) {
        return base(name) + "-%04x".formatted(randomSuffix.getAsInt() & 0xffff);
    }

    static String base(String name) {
        var slug = Normalizer.normalize(name, Normalizer.Form.NFKD)
                .toLowerCase(Locale.ROOT)
                .replaceAll("\\p{M}+", "")
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        if (slug.length() > MAX_BASE_LENGTH) {
            slug = slug.substring(0, MAX_BASE_LENGTH).replaceAll("-+$", "");
        }
        return slug.isEmpty() ? "inbox" : slug;
    }
}
