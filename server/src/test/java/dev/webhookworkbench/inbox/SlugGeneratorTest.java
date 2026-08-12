package dev.webhookworkbench.inbox;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SlugGeneratorTest {

    @Test
    void normalizesAsciiAndDiacriticsAndAppendsFourHexCharacters() {
        var generator = new SlugGenerator(() -> 0xbeef);

        assertThat(generator.next("Résumé / Déjà Vu!"))
                .isEqualTo("resume-deja-vu-beef");
    }

    @Test
    void fallsBackForNamesWithoutAsciiAndNeverExceedsTheColumn() {
        var generator = new SlugGenerator(() -> 1);

        assertThat(generator.next("Платежи")).isEqualTo("inbox-0001");
        // Name at the column limit still produces a slug the column can hold.
        assertThat(generator.next("a ".repeat(InboxName.MAX_CODE_POINTS)))
                .hasSizeLessThanOrEqualTo(InboxName.MAX_CODE_POINTS)
                .endsWith("-0001");
    }
}
