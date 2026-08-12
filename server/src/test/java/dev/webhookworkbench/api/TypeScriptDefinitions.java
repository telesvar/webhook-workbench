package dev.webhookworkbench.api;

import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.time.Instant;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;

import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.util.ClassUtils;

/// Emits web API types from [WireType] records.
///
/// Record components are JSON properties under Jackson's defaults, so reflecting them produces
/// the contract directly.
final class TypeScriptDefinitions {

    private static final String BASE_PACKAGE = "dev.webhookworkbench";

    private TypeScriptDefinitions() {
    }

    static String render() {
        var records = discover();
        var out = new StringBuilder();

        out.append("""
                // Generated from Java @WireType records. Edit the records, then regenerate:
                //   ./scripts/generate-api-types.sh
                //
                // ApiTypeContractTest fails the build when this file drifts from the server.

                /** An RFC 3339 timestamp, as produced by Java's `Instant`. */
                export type Timestamp = string;

                /** A canonical UUID string. */
                export type Uuid = string;
                """);

        for (var type : records.values()) {
            out.append('\n');
            out.append("export interface ").append(type.getSimpleName()).append(" {\n");
            for (var component : type.getRecordComponents()) {
                out.append("  ")
                        .append(component.getName())
                        .append(": ")
                        .append(typeScriptType(component.getGenericType(), records.keySet()))
                        .append(";\n");
            }
            out.append("}\n");
        }

        return out.toString();
    }

    private static Map<String, Class<?>> discover() {
        var scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(WireType.class));

        var found = new TreeMap<String, Class<?>>(Comparator.naturalOrder());
        for (var candidate : scanner.findCandidateComponents(BASE_PACKAGE)) {
            var className = candidate.getBeanClassName();
            if (className == null) {
                continue;
            }
            var type = ClassUtils.resolveClassName(className, TypeScriptDefinitions.class.getClassLoader());
            if (!type.isRecord()) {
                throw new IllegalStateException("@WireType is only valid on records, but " + className + " is not one.");
            }
            found.put(type.getSimpleName(), type);
        }
        if (found.isEmpty()) {
            throw new IllegalStateException("No @WireType records were found under " + BASE_PACKAGE + ".");
        }
        return found;
    }

    private static String typeScriptType(Type type, Set<String> known) {
        if (type instanceof ParameterizedType parameterized) {
            var raw = (Class<?>) parameterized.getRawType();
            var arguments = parameterized.getActualTypeArguments();
            if (Collection.class.isAssignableFrom(raw)) {
                return typeScriptType(arguments[0], known) + "[]";
            }
            if (Map.class.isAssignableFrom(raw)) {
                return "Record<" + typeScriptType(arguments[0], known) + ", "
                        + typeScriptType(arguments[1], known) + ">";
            }
            if (Optional.class.isAssignableFrom(raw)) {
                return typeScriptType(arguments[0], known) + " | null";
            }
            throw new IllegalStateException("No TypeScript mapping for generic type " + type.getTypeName() + ".");
        }

        if (!(type instanceof Class<?> raw)) {
            throw new IllegalStateException("No TypeScript mapping for type " + type.getTypeName() + ".");
        }

        if (raw == String.class) {
            return "string";
        }
        if (raw == UUID.class) {
            return "Uuid";
        }
        if (raw == Instant.class) {
            return "Timestamp";
        }
        if (raw == boolean.class || raw == Boolean.class) {
            return "boolean";
        }
        if (raw == int.class || raw == long.class || raw == double.class
                || raw == Integer.class || raw == Long.class || raw == Double.class) {
            return "number";
        }
        // Jackson's tree model is an arbitrary payload. The client narrows it itself.
        if ("tools.jackson.databind.JsonNode".equals(raw.getName())) {
            return "unknown";
        }
        if (raw.isRecord()) {
            if (!known.contains(raw.getSimpleName())) {
                throw new IllegalStateException(
                        raw.getName() + " is referenced by a @WireType record but is not annotated itself.");
            }
            return raw.getSimpleName();
        }
        throw new IllegalStateException("No TypeScript mapping for " + raw.getName() + ".");
    }

    static List<String> names() {
        return List.copyOf(discover().keySet());
    }
}
