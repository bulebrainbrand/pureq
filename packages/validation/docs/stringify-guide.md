# Stringify Guide

This guide explains `stringify(data, schema, options?)`.

## Why It Exists

Use `stringify(...)` when you want output that respects the schema policy contract instead of blindly serializing raw data.

## Basic Usage

```ts
const output = stringify(input, schema);
```

If the parse step fails, `stringify(...)` returns `Err`.

## Redaction Modes

### mask

`mask` keeps the field and replaces the value with `[REDACTED]`.

### hide

`hide` removes the field from the output entirely.

### none

`none` leaves the value unchanged unless access control denies it.

## Access Control

`options.scope` provides the caller scopes used during field evaluation.

```ts
const output = stringify(input, schema, {
  scope: ["internal"],
});
```

If a field requires a scope that the caller does not have:

- `onDenied: "drop"` removes the field
- `onDenied: "error"` returns `FORBIDDEN_SCOPE`

## Drop Semantics

`drop` means the field is omitted from the output object or array structure.
It is never replaced by `undefined` or `null`.

## Practical Advice

- Use `stringify(...)` for logs, snapshots, audit trails, and transport payloads.
- Use `JSON.stringify(...)` only when you intentionally want raw serialization.
- Prefer `mask` for sensitive but still structurally important values.
- Prefer `hide` when the field should disappear from the output.
