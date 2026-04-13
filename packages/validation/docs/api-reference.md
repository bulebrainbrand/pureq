# API Reference

This page summarizes the public API exported by `@pureq/validation`.

## Entry Point

```ts
import { v, stringify, ok, err, pipe, pipeAsync } from "@pureq/validation";
```

## Result Helpers

- `ok(value)` creates a success result.
- `err(error)` creates a failure result.
- `pipe(initial, ...steps)` chains synchronous validation steps.
- `pipeAsync(initial, ...steps)` chains synchronous or asynchronous validation steps.

## Error Model

- `VALIDATION_ERROR_CODES` defines canonical error codes.
- `createValidationError(...)` creates a stable error object.
- `invalidTypeError(...)`, `invalidFormatError(...)`, and `requiredError(...)` create common validation failures.

## Policy Types

- `ValidationPolicy` describes redaction, scope, and guardrail metadata.
- `ValidationResult<T>` contains `data`, `metadata`, and `policyMap` on success.
- `PolicySchema<T>` is the schema contract shared by all schema builders.

## Schema Builders

- `v.string()` builds a string schema.
- `v.number()` builds a number schema.
- `v.boolean()` builds a boolean schema.
- `v.object(shape)` builds a nested object schema.
- `v.array(schema)` builds a list schema.
- `schema.policy(metadata)` merges policy metadata into a schema instance.

## Guards

- `v.guard(fn, name?)` wraps a validation function and normalizes the result.
- Boolean guards return the original value on `true` and a `ValidationError` on `false`.
- Async guards return a promise that resolves to the same contract.

## Serialization

- `stringify(data, schema, options?)` renders policy-aware output.
- `options.scope` controls access checks for scoped fields.

## Utility Types

- `Infer<typeof schema>` resolves the output type of a schema.
- `DeniedDrop<T>` models omitted-key behavior when a field is dropped.
- `StringifyOptions` defines serialization options.
