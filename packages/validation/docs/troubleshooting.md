# Troubleshooting

This page collects common issues and the fastest fixes.

## The error path looks wrong

Paths are normalized to RFC 6901 JSON Pointer.

Examples:

- `user.profile[0].email` becomes `/user/profile/0/email`
- `$.payload.count` becomes `/payload/count`

## The output still contains a sensitive field

Check the following:

1. The field is marked with `pii: true`.
2. The field uses the expected `redact` mode.
3. You are calling `stringify(...)` instead of `JSON.stringify(...)`.
4. The caller scope is actually passed in `options.scope`.

## A field disappears unexpectedly

That usually means one of these is true:

- `redact: "hide"` is set
- `onDenied: "drop"` is set and the caller does not have the required scope

If you want the output to fail instead of dropping the field, set `onDenied: "error"`.

## A guard never runs

`pipe(...)` and `pipeAsync(...)` short-circuit on the first failure.
If a previous step fails, later guards are skipped by design.

## The parser returned a type error

Type errors usually mean the input shape does not match the schema.

Examples:

- `v.string()` expects a string
- `v.number()` rejects `NaN`
- `v.object(...)` expects a plain object
- `v.array(...)` expects an array

## Best First Debug Step

When something is unclear, inspect the result object:

```ts
const result = schema.parse(input);

if (!result.ok) {
  console.log(result.error.code);
  console.log(result.error.path);
  console.log(result.error.message);
}
```
