# Schema Reference

This guide explains the schema builders provided by `@pureq/validation`.

## String Schema

```ts
const schema = v.string();
const email = v.string().email();
const id = v.string().uuid();
```

Use string schemas for textual input. The built-in validators are intentionally minimal and deterministic.

## Number Schema

```ts
const schema = v.number();
```

Number schemas reject `NaN` and only accept finite numeric values of type `number`.

## Boolean Schema

```ts
const schema = v.boolean();
```

Boolean schemas accept only `true` and `false`.

## Object Schema

```ts
const schema = v.object({
  id: v.string().uuid(),
  profile: v.object({
    email: v.string().email(),
  }),
});
```

Object schemas parse nested fields recursively and preserve field-level policy metadata in `policyMap`.

## Array Schema

```ts
const schema = v.array(v.string());
```

Array schemas validate each item in order and track indexed JSON Pointer paths such as `/items/0`.

## Parse Contract

Every schema follows the same contract:

- success returns `Result.ok === true`
- failure returns `Result.ok === false`
- errors include a JSON Pointer `path`
- success includes `data`, `metadata`, and `policyMap`

## Policy Chaining

```ts
const schema = v
  .string()
  .policy({ pii: false, redact: "none" })
  .policy({ pii: true, redact: "mask" });
```

Policy chaining is immutable. Each call returns a new schema instance.
