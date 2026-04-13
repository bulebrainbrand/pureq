# Changelog

All notable changes to `@pureq/validation` are documented in this file.

## [Unreleased]

### Added (Unreleased)

- Policy-aware parsing, RFC 6901 policy maps, guardrail chaining, and policy-aware stringify support.
- Package-level onboarding links and draft release notes for `@pureq/validation`.

## [0.1.0-draft]

### Added (0.1.0-draft)

- `Result<T, E>` core helpers with zero-throw validation flows.
- `ValidationError` canonical error codes and JSON Pointer paths.
- Primitive, composite, and policy-aware schemas.
- `v.guard(fn)`, `pipe`, and `pipeAsync` guardrail execution support.
- `stringify(data, schema, options?)` with redaction and scope-based output control.
- English-only documentation and source-comment policy checks for the validation package.
