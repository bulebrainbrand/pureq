# @pureq/validation Quickstart

`@pureq/validation` provides policy-aware schemas with a zero-throw parse contract.

## Install

```bash
pnpm add @pureq/validation
```

## Parse data

```ts
import { v } from "@pureq/validation";

const userSchema = v.object({
  id: v.string().uuid(),
  email: v.string().email().policy({ pii: true, redact: "mask" }),
});

const result = userSchema.parse({
  id: "550e8400-e29b-41d4-a716-446655440000",
  email: "user@example.com",
});

if (result.ok) {
  console.log(result.value.data);
  console.log(result.value.policyMap);
}
```

## Guard values

```ts
import { ok, pipe, v } from "@pureq/validation";

const positive = v.guard((value: number) => value > 0, "positive");
const checked = pipe(ok(10), positive);
```

## Serialize with policy-aware redaction

```ts
import { stringify, v } from "@pureq/validation";

const schema = v.object({
  profile: v.object({
    email: v.string().policy({ pii: true, redact: "mask" }),
  }),
});

const output = stringify(
  { profile: { email: "user@example.com" } },
  schema,
);

if (output.ok) {
  console.log(output.value);
}
```

## Scope-based output control

```ts
import { stringify, v } from "@pureq/validation";

const schema = v.object({
  secret: v.string().policy({ scope: ["internal"], onDenied: "drop" }),
});

const output = stringify({ secret: "value" }, schema, {
  scope: [],
});
```

Fields denied by scope are removed when `onDenied` is `drop` and fail with `FORBIDDEN_SCOPE` when `onDenied` is `error`.
