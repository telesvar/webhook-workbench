package dev.webhookworkbench;

import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.UUID;

/// UUIDv7 helpers and the compact BINARY(16) form used at the JDBC boundary.
public final class Uuid {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final long TIMESTAMP_MASK = 0xFFFF_FFFF_FFFFL;

    private Uuid() {
    }

    public static UUID v7(Instant instant) {
        var timestamp = instant.toEpochMilli();
        if ((timestamp & TIMESTAMP_MASK) != timestamp) {
            throw new IllegalArgumentException("UUIDv7 timestamp is outside its 48-bit range");
        }
        var mostSignificantBits = timestamp << 16 | 0x7000L | RANDOM.nextInt(1 << 12);
        var leastSignificantBits = RANDOM.nextLong() & 0x3FFF_FFFF_FFFF_FFFFL
                | 0x8000_0000_0000_0000L;
        return new UUID(mostSignificantBits, leastSignificantBits);
    }

    /// Creation time carried by a v7 id, to the millisecond.
    public static Instant instant(UUID uuid) {
        return Instant.ofEpochMilli(uuid.getMostSignificantBits() >>> 16);
    }

    public static byte[] bytes(UUID uuid) {
        return ByteBuffer.allocate(16)
                .putLong(uuid.getMostSignificantBits())
                .putLong(uuid.getLeastSignificantBits())
                .array();
    }

    public static UUID read(ResultSet resultSet, String column) throws SQLException {
        var bytes = ByteBuffer.wrap(resultSet.getBytes(column));
        return new UUID(bytes.getLong(), bytes.getLong());
    }
}
