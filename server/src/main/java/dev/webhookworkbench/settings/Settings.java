package dev.webhookworkbench.settings;

import java.util.List;

import dev.webhookworkbench.api.WireType;

/// Field names the UI masks across headers, JSON keys, form fields, and XML.
@WireType
public record Settings(List<String> maskedFields) {
}
