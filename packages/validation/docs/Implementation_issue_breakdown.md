# @pureq/validation Issue Breakdown (v0.1.0-draft)

This document converts the implementation plan into issue-ready templates.
All text is intentionally English-only to match the repository language policy.

## Label Set (recommended)

- `area:validation`
- `kind:feature`
- `kind:refactor`
- `kind:test`
- `kind:docs`
- `priority:p0`
- `priority:p1`
- `phase:1`
- `phase:2`
- `phase:3`
- `phase:4`
- `phase:5`
- `blocked:db-post-release`

## Milestone Mapping

- Milestone `validation-v0.1.0-m1`: Issue 1-4
- Milestone `validation-v0.1.0-m2`: Issue 5-8
- Milestone `validation-v0.1.0-m3`: Issue 9-10
- Milestone `validation-v0.1.0-m4`: Issue 11-14
- Milestone `validation-post-release-db-bridge`: Issue 15

## Issue 1: Core Result Type and Utilities

Title:
`feat(validation): implement Result core with combine and mapError`

Scope:

- Implement `Result<T, E>` core utilities.
- Implement `combine` to aggregate multiple results and accumulate errors.
- Implement `mapError` to normalize low-level errors into `ValidationError`.

Out of scope:

- Schema parsing logic.

Acceptance criteria:

- `combine` returns success only when all inputs are success.
- `combine` returns accumulated errors when any input fails.
- `mapError` preserves source context and attaches path/code metadata.
- Public APIs in this issue do not throw.

Test checklist:

- Unit tests for success-only aggregation.
- Unit tests for mixed success/failure aggregation.
- Unit tests for error mapping edge cases.

Dependencies:

- None.

Labels:

- `area:validation`, `kind:feature`, `priority:p0`, `phase:1`

## Issue 2: ValidationError Canonical Model

Title:
`feat(validation): define ValidationError model and code registry`

Scope:

- Define `ValidationError` canonical shape.
- Add error code registry (`invalid_type`, `invalid_format`, etc.).
- Add helper constructors for consistent error creation.

Acceptance criteria:

- All generated errors follow one canonical structure.
- Error path is required for parse-related failures.
- Error constructors are deterministic and side-effect free.

Test checklist:

- Unit tests for each error code constructor.
- Snapshot tests for stable error shape.

Dependencies:

- Issue 1 preferred.

Labels:

- `area:validation`, `kind:feature`, `priority:p0`, `phase:1`

## Issue 3: Primitive Schemas

Title:
`feat(validation): implement string number boolean schemas`

Scope:

- Implement `v.string()`, `v.number()`, `v.boolean()`.
- Implement minimal string validators (`uuid`, `email`).
- Enforce no-throw parsing contract.

Acceptance criteria:

- Invalid primitives always return `Err<ValidationError>`.
- Valid primitives return `Ok` with typed value.
- `uuid` and `email` validators are deterministic.

Test checklist:

- Unit tests for valid/invalid values by type.
- Unit tests for `uuid` and `email` validators.

Dependencies:

- Issue 1, Issue 2.

Labels:

- `area:validation`, `kind:feature`, `priority:p0`, `phase:1`

## Issue 4: No-Throw CI Guard

Title:
`chore(validation): add no-throw CI guard for public flows`

Scope:

- Add CI check to prevent forbidden throw usage in validation public flows.
- Add documentation for allowed internal exception boundaries (if any).

Acceptance criteria:

- CI fails when forbidden throw usage is introduced.
- Exceptions inside guard execution paths are normalized to `Err`.

Test checklist:

- Add one intentional failing fixture to validate guard behavior in CI.

Dependencies:

- Issue 1.

Labels:

- `area:validation`, `kind:refactor`, `kind:test`, `priority:p1`, `phase:1`

## Issue 5: ValidationPolicy and policy() Modifier

Title:
`feat(validation): implement ValidationPolicy and policy modifier`

Scope:

- Define `ValidationPolicy` type and defaults.
- Implement `schema.policy(metadata)` chaining.
- Implement merge strategy (child override, scope union, pii OR).

Acceptance criteria:

- Chained policies merge deterministically.
- Metadata always exists after parse.

Test checklist:

- Unit tests for merge precedence.
- Unit tests for default policy behavior.

Dependencies:

- Issue 3.

Labels:

- `area:validation`, `kind:feature`, `priority:p0`, `phase:2`

## Issue 6: ValidationResult and Policy Context

Title:
`feat(validation): implement ValidationResult with policy map`

Scope:

- Define `ValidationResult<T>` payload.
- Include `metadata` and `policyMap` in success output.
- Ensure parse collects policy context at field-level.

Acceptance criteria:

- `policyMap` is always produced on success.
- Policy map and metadata are consistent with applied policies.

Test checklist:

- Unit tests for metadata and map consistency.
- Snapshot tests for stable payload shape.

Dependencies:

- Issue 5.

Labels:

- `area:validation`, `kind:feature`, `priority:p0`, `phase:2`

## Issue 7: JSON Pointer Canonical Pathing

Title:
`feat(validation): adopt RFC6901 JSON Pointer for policyMap keys`

Scope:

- Implement JSON Pointer encoder and decoder utilities.
- Enforce RFC 6901 escaping (`~0`, `~1`).
- Replace any JSONPath-like internal path outputs.

Acceptance criteria:

- All runtime `policyMap` keys are JSON Pointer.
- Round-trip encode/decode is lossless.

Test checklist:

- Compliance tests for RFC 6901 escaping.
- Regression tests preventing JSONPath output.

Dependencies:

- Issue 6.

Labels:

- `area:validation`, `kind:feature`, `priority:p0`, `phase:2`

## Issue 8: Object and Array Schemas with Recursive Inference

Title:
`feat(validation): implement object array schemas and recursive infer`

Scope:

- Implement `v.object(shape)` and `v.array(schema)`.
- Track nested paths using JSON Pointer.
- Support recursive type inference.

Acceptance criteria:

- Nested validation reports correct pointer paths.
- Inference works for practical nested schemas.

Test checklist:

- Unit tests for nested object and array failures.
- Type tests for inferred output shape.

Dependencies:

- Issue 3, Issue 7.

Labels:

- `area:validation`, `kind:feature`, `priority:p0`, `phase:3`

## Issue 9: Type-level Performance Guardrails

Title:
`perf(validation): add type-level depth guard and compile budget checks`

Scope:

- Add depth cap utility types to avoid pathological recursion.
- Refactor recursive types toward tail-recursive style where possible.
- Add CI compile-time benchmark fixture and budget thresholds.

Acceptance criteria:

- Type checking remains within agreed time/memory budget.
- CI fails on measurable regression beyond threshold.

Test checklist:

- Baseline benchmark fixture.
- Regression fixture for deep nested schemas.

Dependencies:

- Issue 8.

Labels:

- `area:validation`, `kind:feature`, `kind:test`, `priority:p1`, `phase:3`

## Issue 10: Guardrail Chain and Pipe Integration

Title:
`feat(validation): implement guardrail chain with sync and async support`

Scope:

- Implement `v.guard(fn)`.
- Integrate guard execution with `Result.pipe(...)`.
- Ensure exception capture and normalization.

Acceptance criteria:

- Guards execute in order.
- Chain short-circuits on first failure.
- Async guard behavior remains deterministic.

Test checklist:

- Unit tests for chain order.
- Unit tests for short-circuit behavior.
- Unit tests for async guard failures.

Dependencies:

- Issue 1, Issue 6.

Labels:

- `area:validation`, `kind:feature`, `priority:p0`, `phase:4`

## Issue 11: Redaction Engine and stringify

Title:
`feat(validation): implement policy-aware stringify and redaction`

Scope:

- Implement `pureq.stringify(data, schema)`.
- Implement `mask`, `hide`, and `none` modes.
- Apply scope checks and denied handling.

Acceptance criteria:

- PII fields follow policy redaction.
- Hidden fields are removed from output.
- No throw escapes from stringify path.

Test checklist:

- Unit tests by redaction mode.
- Snapshot tests for representative policy combinations.

Dependencies:

- Issue 7, Issue 10.

Labels:

- `area:validation`, `kind:feature`, `priority:p0`, `phase:5`

## Issue 12: onDenied Semantics and Output Typing

Title:
`feat(validation): define onDenied drop error semantics and output types`

Scope:

- Enforce normative behavior for `onDenied: 'drop'` and `'error'`.
- Introduce `DeniedDrop<T>` baseline utility type.
- Guarantee omitted-key behavior for drop semantics.

Acceptance criteria:

- `drop` physically removes fields.
- `drop` never rewrites to `undefined` or `null`.
- `'error'` returns `Err` with no partial emission.

Test checklist:

- Unit tests for runtime behavior.
- Type tests for omitted-key modeling.

Dependencies:

- Issue 8, Issue 11.

Labels:

- `area:validation`, `kind:feature`, `priority:p0`, `phase:5`

## Issue 13: English-only Docs and Comment Policy Enforcement

Title:
`chore(validation): enforce English-only docs and source comments`

Scope:

- Add CI checks for docs language in `packages/validation/docs`.
- Add lint/check pipeline for comment language in `packages/validation/src`.
- Add PR checklist items for language policy.

Acceptance criteria:

- CI fails for non-English docs/comments under validation package scope.
- Rule documentation is discoverable by contributors.

Test checklist:

- Add one failing fixture for docs policy.
- Add one failing fixture for source comment policy.

Dependencies:

- None.

Labels:

- `area:validation`, `kind:docs`, `kind:test`, `priority:p1`, `phase:5`

## Issue 14: Quickstart and Release Notes

Title:
`docs(validation): publish quickstart and v0.1.0-draft release notes`

Scope:

- Add quickstart examples aligned with final API and path format.
- Publish release notes summarizing contracts and migration notes.

Acceptance criteria:

- Quickstart examples compile and run.
- Release notes explicitly describe JSON Pointer and onDenied behavior.

Test checklist:

- Example snippets validated in CI (or doc test flow).

Dependencies:

- Issue 11, Issue 12, Issue 13.

Labels:

- `area:validation`, `kind:docs`, `priority:p1`, `phase:5`

## Issue 15: Post-release `@pureq/db` Integration Kickoff (Blocked)

Title:
`feat(db): start db integration using frozen validation contracts`

Scope:

- Begin `@pureq/db` implementation only after validation release gates pass.
- Consume frozen `ValidationPolicy`, `ValidationResult`, and `policyMap` contracts.
- Define db-side policy handling for insert/update/audit flows.

Blocked by:

- Validation release completion.
- Contract tests green.
- Redaction snapshots frozen.

Acceptance criteria:

- db prototype consumes JSON Pointer policyMap keys.
- No ambiguity in dropped-field persistence semantics.

Labels:

- `kind:feature`, `blocked:db-post-release`

## PR Template Snippet (optional)

Use this checklist in validation-related PRs:

- [ ] Comments are English-only.
- [ ] Docs are English-only.
- [ ] No throw in public validation flows.
- [ ] policyMap uses JSON Pointer only.
- [ ] onDenied behavior is covered by tests.
- [ ] Type-level performance baseline is not regressed.
