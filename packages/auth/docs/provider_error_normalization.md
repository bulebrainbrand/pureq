# Provider Error Normalization

`@pureq/auth` now includes a small provider error normalization layer.

## Why

Provider flows can fail with heterogeneous error shapes.

`normalizeProviderError` converts known provider/auth codes into a stable shape:

- `code`
- `message`
- `status`
- `retriable`

## Built-in table

`PROVIDER_ERROR_NORMALIZATION_TABLE` includes mappings for common callback and token-exchange failures.

Example:

```ts
import { normalizeProviderError } from "@pureq/auth";

try {
  // provider operation
} catch (error) {
  const normalized = normalizeProviderError(error);
  // map to response telemetry / retry strategy
}
```

## Notes

- Unknown errors are mapped to a safe fallback (`status: 500`, `retriable: false`).
- Use this normalization before exposing provider failures to external clients.
