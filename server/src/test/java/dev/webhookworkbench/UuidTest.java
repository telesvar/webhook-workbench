package dev.webhookworkbench;

import java.sql.ResultSet;
import java.time.Instant;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class UuidTest {

    @Test
    void createsUuidV7WithTheRequestedTimestamp() {
        var instant = Instant.parse("2026-08-10T12:34:56.789Z");

        var uuid = Uuid.v7(instant);

        assertThat(uuid.version()).isEqualTo(7);
        assertThat(uuid.variant()).isEqualTo(2);
        assertThat(uuid.getMostSignificantBits() >>> 16).isEqualTo(instant.toEpochMilli());
        assertThat(Uuid.v7(instant)).isNotEqualTo(uuid);
    }

    @Test
    void roundTripsTheBinaryDatabaseRepresentation() throws Exception {
        var expected = Uuid.v7(Instant.now());
        var resultSet = mock(ResultSet.class);
        when(resultSet.getBytes("id")).thenReturn(Uuid.bytes(expected));

        assertThat(Uuid.read(resultSet, "id")).isEqualTo(expected);
    }
}
