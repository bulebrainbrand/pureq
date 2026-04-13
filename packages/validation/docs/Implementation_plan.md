# @pureq/validation Implementation Plan (v0.1.0-draft)

## 0. Purpose and Scope

This document defines a staged implementation plan for `@pureq/validation`, from MVP to an extensible architecture.

Design principles:

- Zero-Throw: Never throw exceptions from public flows; always return `Result<T, E>`.
- Policy-Integrated: Attach confidentiality and authorization metadata directly to schema definitions.
- Layer-Pass: Propagate both validated data and policy context to downstream layers.
- Future DB-Ready: Keep contracts stable for a post-release `@pureq/db` integration.

Non-scope in `v0.1.0`:

- Full i18n message catalog.
- Exhaustive format validator coverage.
- Any concrete database adapter implementation (belongs to `@pureq/db`).

## 1. Mandatory Language Policy (Repository Rule)

The following rule is mandatory for this package and all related docs:

- All code comments MUST be written in English.
- All documentation MUST be written in English.
- New Japanese comments/docs are not allowed in `@pureq/validation`.

Enforcement plan:

- Add a CI text check for docs under `packages/validation/docs`.
- Add a lint check for source comments in `packages/validation/src`.
- Add PR checklist items: “Comments in English” and “Docs in English”.

## 2. Deliverables (`v0.1.0`)

### 2.1 Public API (initial)

- `v.string()`
- `v.number()`
- `v.boolean()`
- `v.object(shape)`
- `v.array(schema)`
- `schema.policy(metadata)`
- `schema.parse(input): Result<T, ValidationError>`
- `v.guard(fn)` and `Result.pipe(...)`
- `pureq.stringify(data, schema, options?)`

### 2.2 Type-level deliverables

- `PolicySchema<T>`
- `ValidationPolicy`
- `ValidationResult<T>` (value + policy context)
- `Infer<typeof schema>`
- `PolicyMap<T>` (field-level policy map)

### 2.3 Runtime deliverables

- Guardrail chain executor (sync/async)
- Redaction engine (`mask` / `hide` / `none`)
- Error normalization (`ValidationError` canonical shape)

## 3. Architecture Guidelines

### 3.1 Module layout proposal

- `src/result/`
  - `result.ts`: `Result`, `Ok`, `Err`, `pipe`
- `src/errors/`
  - `validation-error.ts`: error model, code, path
- `src/policy/`
  - `types.ts`: `ValidationPolicy`, `GuardrailRule`
  - `merge.ts`: parent-child policy merge rules
  - `context.ts`: policy tracking context during parse
- `src/schema/`
  - `base.ts`: `PolicySchema<T>` base
  - `primitive/`: string, number, boolean
  - `composite/`: object, array, enum
  - `modifiers/`: `policy()`, `optional()`, `nullable()`
- `src/guard/`
  - `guard.ts`: `v.guard`, chain execution
- `src/redaction/`
  - `stringify.ts`: `pureq.stringify`
  - `redact.ts`: redaction strategies
- `src/index.ts`

### 3.2 Zero-Throw implementation rules

- No `throw` in public APIs.
- Any conversion failure from `unknown` must become `Err<ValidationError>`.
- Any exception inside guardrail execution must be captured and normalized to `Err`.
- Add CI protection to detect forbidden `throw` usage in package source.

### 3.3 Policy propagation rules

- Parent `object` policy can be inherited by children.
- Child policy overrides parent on key conflict.
- `scope` is merged as union (deduplicated).
- `pii` is aggregated by OR (`true` dominates).
- `redact` precedence: child > parent > default (`none`).

## 4. Staged Implementation Plan

## Phase 1: Core Result + Primitive Schema

Goal:

- Establish a safe minimal parse flow.

Implementation:

- `Result<T, E>` foundation.
- `ValidationError` baseline (`code`, `message`, `path`, `details`).
- `v.string()`, `v.number()`, `v.boolean()`.
- Minimum string validators (`uuid`, `email`).
- Unified `schema.parse()` contract.

Acceptance criteria:

- Primitive parse never throws.
- Invalid input always returns `Err`.
- Primitive `Infer` types are correct.

## Phase 2: `policy()` + ValidationResult

Goal:

- Bind validated values with policy metadata.

Implementation:

- `ValidationPolicy` type and defaults.
- `schema.policy(metadata)` chaining.
- `ValidationResult<T>` with `policyMap` and `metadata`.
- Field-level policy collection during parse.

Acceptance criteria:

- `metadata` always exists, even when no explicit policy is set.
- Chained `policy()` resolves deterministically using merge rules.
- Policy context is inspectable on successful parse.

## Phase 3: Object/Array + Recursive Inference

Goal:

- Enable practical composition for production schemas.

Implementation:

- `v.object(shape)`.
- `v.array(schema)`.
- Nested path tracking (`user.profile.email`).
- Child policy propagation into parent result context.

Acceptance criteria:

- Nested success/failure is evaluated correctly.
- Error `path` stays accurate.
- Recursive `Infer` generates expected output types.

## Phase 4: Guardrail Chain

Goal:

- Integrate business-level constraints after structural validation.

Implementation:

- `v.guard(fn)` with sync/async support.
- `Result.pipe(...)` composition.
- Exception capture -> normalized `Err`.
- Guard execution context (`ctx`) specification.

Acceptance criteria:

- Multiple guards execute in order.
- Chain short-circuits on first failure.
- Async guards preserve API contract correctness.

## Phase 5: Redaction + `stringify`

Goal:

- Complete observability-safe output handling.

Implementation:

- `pureq.stringify(data, schema)`.
- Policy-driven redaction (`mask` / `hide` / `none`).
- `scope` and `onDenied: 'drop'` handling.
- O(n) traversal with low allocation overhead.

Acceptance criteria:

- PII fields are redacted as specified.
- Unauthorized fields are dropped correctly.
- No exception escapes from stringify flow.

## 5. Type Design Details

### 5.1 Core types

```ts
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type ValidationPolicy = {
  redact?: 'mask' | 'hide' | 'none';
  pii?: boolean;
  scope?: string[];
  guardrails?: GuardrailRule[];
  onDenied?: 'drop' | 'error';
};

export interface PolicySchema<T> {
  parse(input: unknown): ValidationResult<T>;
  readonly metadata: ValidationPolicy;
  readonly type: T;
  policy(metadata: ValidationPolicy): PolicySchema<T>;
}
```

### 5.2 Initial `ValidationResult` shape

```ts
export type ValidationResult<T> = Result<{
  data: T;
  policyMap: Record<string, ValidationPolicy>;
  metadata: ValidationPolicy;
}, ValidationError>;
```

Notes:

- `policyMap` keys use RFC 6901 JSON Pointer format (for example `/email`, `/profile/phone`).
- Escaping follows RFC 6901 (`~` -> `~0`, `/` -> `~1`).
- JSON Pointer is selected over JSONPath for deterministic parsing, simpler split/merge logic, and stronger low-level interoperability.
- The map can later evolve to a tree structure without breaking v0 contracts.

### 5.3 `policyMap` key format decision record

Decision:

- Adopt JSON Pointer as the canonical key format in `v0.1.0`.

Rationale:

- Implementation simplicity: path traversal is straightforward with `/` tokenization.
- Better fit for strict low-level contracts and transport-safe serialization.
- Easier cross-layer portability (logging, storage, db contract tables).

Compatibility note:

- Legacy JSONPath-like examples in early drafts are documentation-only and non-normative.
- All runtime outputs and tests must assert JSON Pointer keys.

## 6. Error Strategy

### 6.1 Error code candidates

- `invalid_type`
- `invalid_format`
- `out_of_range`
- `required`
- `forbidden_scope`
- `guardrail_failed`
- `internal_guard_exception`

### 6.2 Error object

```ts
type ValidationError = {
  code: string;
  message: string;
  path: string;
  details?: Record<string, unknown>;
  cause?: string;
};
```

## 7. Test Plan

### 7.1 Unit tests

- Primitive parse success/failure.
- Policy merge behavior.
- Object/array nested inference.
- Guard chain short-circuit and exception capture.
- Redaction behavior by mode.

### 7.2 Property tests (optional)

- Parsing should never throw for arbitrary input.
- Hidden fields must never appear in stringify output.

### 7.3 Compatibility checks

- Behavioral comparison with representative Zod/Valibot scenarios.
- Explicitly document expected return-model differences (`throw` vs `Result`).

### 7.4 Type-level performance regression checks

- Add compile-time benchmark fixtures for deeply nested object schemas.
- Track TypeScript check time and memory in CI with a fixed threshold budget.
- Fail CI when type-check degradation exceeds agreed baseline.

## 8. `@pureq/db` Readiness and Release Sequencing

### 8.1 Explicit sequencing rule

- `@pureq/db` development starts only after `@pureq/validation` is released.
- No blocking dependency from validation to db implementation is allowed in v0.1.0.
- Validation must expose stable integration contracts before db work begins.

### 8.2 Integration points reserved for post-release db work

- Pass `ValidationResult.policyMap` to the db layer as a policy contract.
- Reuse redaction policy for insert/update audit logging.
- Use `scope` as an input signal for column-level access decisions.

### 8.3 Pre-freeze contracts required before validation release

- `policyMap` key format (JSON Pointer fixed, including RFC 6901 escaping).
- Minimal policy set required by db side.
- Audit semantics for dropped fields (`onDenied: 'drop'`).

### 8.5 `onDenied: 'drop'` semantics contract

Normative behavior:

- `drop` means the field is physically removed from the output object.
- The field must not be emitted as `undefined` and must not be rewritten as `null`.
- `onDenied: 'error'` returns `Err` and does not emit partial data.

Type contract:

- Output type must encode dropped-field possibility explicitly.
- For v0.1.0, denied fields are represented as an omitted-key variant rather than implicit `undefined`.
- Public helper type recommendation: `DeniedDrop<T>` that rewrites affected fields to optional omitted keys.

DB safety note:

- This contract prevents accidental null persistence in `@pureq/db` insert/update paths.

### 8.4 Post-release db kickoff gate

`@pureq/db` implementation may start only when all conditions are met:

- Validation API marked stable for `PolicySchema`, `ValidationResult`, and `ValidationPolicy`.
- Contract tests for policy propagation are green.
- Redaction behavior snapshot is frozen.
- Integration note is published in validation docs.

## 9. Delivery Plan

### 9.1 Execution order

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4
5. Phase 5

### 9.2 Definition of Done

- API docs updated in English.
- Unit tests passing.
- Type tests passing.
- Static verification for no-throw policy passing.
- Quickstart examples working.
- Language policy checks passing (English-only comments/docs).
- JSON Pointer contract tests passing.
- `onDenied` behavior tests passing (drop vs error).

### 9.3 Risks and mitigations

- Risk: policy merge complexity may cause unintended authorization leaks.
  - Mitigation: freeze merge rules and add snapshot tests.
- Risk: deep recursive inference may degrade type-check performance.
  - Mitigation: split utility types, apply tail-recursive patterns where possible, and enforce a depth cap guard type.
- Risk: async guard boundaries may split API ergonomics.
  - Mitigation: keep extension path for future `parseAsync`.
- Risk: denied-field dropping may cause consumer-side shape assumptions.
  - Mitigation: codify omitted-key semantics and provide explicit utility types for dropped-field outputs.

## 10. Milestones

- M1 (Week 1): Phase 1 complete.
- M2 (Week 2): Phase 2-3 complete.
- M3 (Week 3): Phase 4 complete.
- M4 (Week 4): Phase 5 + docs + release prep complete.
- M5 (Post-release): Start `@pureq/db` implementation using frozen validation contracts.

## 11. Initial Task Breakdown (Issue-ready)

- [x] Implement core `Result` + tests.
- [x] Implement `combine` helper to aggregate multiple `Result` values and accumulate errors.
- [x] Implement `mapError` helper to normalize low-level parser errors into `ValidationError`.
- [x] Implement `ValidationError` model and error codes.
- [x] Implement primitive schemas (`string`, `number`, `boolean`).
- [x] Implement `policy()` and merge rule tests.
- [x] Implement `object` / `array` schemas.
- [x] Implement `ValidationResult.policyMap`.
- [x] Implement JSON Pointer path encoder/decoder helpers with RFC 6901 compliance tests.
- [x] Implement `guard` / `pipe` chain.
- [x] Implement type-level depth guard utilities.
- [x] Implement `pureq.stringify` redaction flow.
- [x] Implement denied-field type utilities (`DeniedDrop<T>` baseline).
- [x] Add quickstart docs (English).
- [x] Add language policy CI checks (comments/docs in English only).
- [x] Publish release note (`v0.1.0-draft`).

---
This plan targets `v0.1.0-draft`. After validation release, `@pureq/db` can begin with the frozen policy contracts defined in this document.

Issue-ready breakdown:

- See `Implementation_issue_breakdown.md` for one-issue-per-scope templates, dependencies, and acceptance checklists.
