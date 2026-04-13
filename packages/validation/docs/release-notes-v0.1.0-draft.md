# @pureq/validation v0.1.0-draft Release Notes

This draft release freezes the initial validation contract for `@pureq/validation`.

## Highlights

- `Result<T, E>` utilities with zero-throw public flows.
- Canonical `ValidationError` codes and JSON Pointer paths.
- Primitive, object, and array schemas with recursive inference.
- Policy-aware metadata propagation through `ValidationResult`.
- `v.guard(fn)` and `pipeAsync` for guardrail chaining.
- `stringify(data, schema, options?)` with policy-aware redaction and scope control.

## Contract notes

- Runtime policy keys use RFC 6901 JSON Pointer.
- `redact: "mask"` replaces sensitive values with `[REDACTED]`.
- `redact: "hide"` removes sensitive fields from serialized output.
- `onDenied: "drop"` removes unauthorized fields without writing `undefined` or `null`.
- `onDenied: "error"` returns `FORBIDDEN_SCOPE` and emits no partial output.

## Migration notes

- Prefer `schema.parse()` for structural validation.
- Use `stringify()` for observability-safe serialization.
- Pass the consumer scope list through `stringify(..., { scope })` when enforcing access control.

## Next step

The release freeze enables post-release work on `@pureq/db` using the frozen validation contracts.
