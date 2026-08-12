package dev.webhookworkbench.api;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/// Marks a record whose JSON shape is part of the web API contract.
///
/// `TypeScriptDefinitions` emits `web/src/api/generated.ts` from every annotated record, so
/// renaming or removing a component is a breaking API change. Server-internal types should not
/// carry this annotation.
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
public @interface WireType {
}
