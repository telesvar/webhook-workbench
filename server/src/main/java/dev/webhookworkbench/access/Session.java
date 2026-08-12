package dev.webhookworkbench.access;

import dev.webhookworkbench.api.WireType;

@WireType
public record Session(boolean authenticationRequired) {
}
