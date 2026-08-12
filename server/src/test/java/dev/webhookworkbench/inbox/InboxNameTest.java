package dev.webhookworkbench.inbox;

import dev.webhookworkbench.problem.WorkbenchException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class InboxNameTest {

    @Test
    void trimsAndCountsUnicodeByCodePoint() {
        var name = "😀".repeat(InboxName.MAX_CODE_POINTS);

        assertThat(InboxName.validateAndNormalize("  " + name + "  ")).isEqualTo(name);
    }

    @Test
    void rejectsMissingEmptyLongAndControlCharacterNames() {
        assertThatThrownBy(() -> InboxName.validateAndNormalize(null)).isInstanceOf(WorkbenchException.class);
        assertThatThrownBy(() -> InboxName.validateAndNormalize(" \n ")).isInstanceOf(WorkbenchException.class);
        assertThatThrownBy(() -> InboxName.validateAndNormalize("a".repeat(InboxName.MAX_CODE_POINTS + 1))).isInstanceOf(WorkbenchException.class);
        assertThatThrownBy(() -> InboxName.validateAndNormalize("payments\u0000events"))
                .isInstanceOf(WorkbenchException.class);
    }
}
