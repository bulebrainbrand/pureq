# Policy Guide

This guide explains how policy metadata works in `@pureq/validation`.

## ValidationPolicy

A policy may include:

- `redact`: `"mask"`, `"hide"`, or `"none"`
- `pii`: whether the field should be treated as sensitive
- `scope`: required access scopes for the field
- `guardrails`: guardrail descriptors for higher-level checks
- `onDenied`: `"drop"` or `"error"`

## Merge Rules

Policy merging is deterministic:

- child scalar values override parent scalar values
- `scope` is merged as a deduplicated union
- `pii` is merged with OR semantics
- `guardrails` are appended in order
- `redact` and `onDenied` fall back to parent values when the child omits them

## Field-Level Metadata

Successful parse results include a `policyMap`:

```ts
const result = schema.parse(input);
```

The map uses RFC 6901 JSON Pointer keys, so nested fields appear as paths like:

- `/`
- `/profile`
- `/profile/email`
- `/items/0`

## Practical Examples

### Sensitive field masking

```ts
const schema = v.object({
  email: v.string().email().policy({ pii: true, redact: "mask" }),
});
```

### Scoped access control

```ts
const schema = v.object({
  secret: v.string().policy({ scope: ["internal"], onDenied: "drop" }),
});
```

Use `scope` when a field should be available only to specific callers.

## When to Use Policy

Add policy metadata when you need one of these outcomes:

- redaction in logs or serialized output
- field-level access control
- downstream auditing or database contract propagation
- explicit handling of private or regulated data
