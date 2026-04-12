# @pureq/auth Implementation Plan (Rebuilt)

This plan replaces the previous roadmap and focuses on one concrete objective:

Build a product-core auth experience that feels as immediate as Auth.js while preserving pureq-style explicit security and policy control.

## Why Rebuild This Plan

`@pureq/auth` has strong primitives, but adoption friction is still too high for teams expecting an Auth.js-level "works quickly" path.

The new plan shifts priority from breadth-first feature additions to integration-first productization.

## Product Core Statement

The package must provide a clear core, not only composable parts.

Core = `createAuthKit`-style setup that gives:

- provider setup
- adapter wiring
- route handlers
- session store/hook bootstrap
- SSR/BFF handoff helpers
- security defaults with explicit override points

in one cohesive flow.

## North Star

A new team should be able to go from install to production-like auth wiring in under 30 minutes, with no hidden behavior and no security regressions.

## Current Baseline (As Of 2026-04-12)

Already implemented and validated:

- core route handlers (`signIn`, `callback`, `session`, `signOut`)
- credentials and email magic-link callback token consumption
- callback authorization gate via `callbacks.signIn`
- SQL adapters for PostgreSQL/MySQL + schema helpers
- session refresh dedupe fixes and BroadcastChannel stability fixes
- full unit suite green (`test:unit`)

What still feels weak from a product perspective:

- docs are broad, but golden-path setup is still fragmented
- provider and adapter ergonomics still expose too many early decisions
- migration confidence checks are manual

## Strategic Shift

Old direction: parity checklist completion.

New direction: integration spine first, then parity depth behind it.

Execution principle:

1. Define the golden path API
2. Make it secure by default
3. Back it with reference adapters/providers
4. Add migration diagnostics
5. Expand advanced features only after core ergonomics are stable

## Current Execution Order

The implementation passes are ordered to reduce risk:

1. Add a starter helper that bundles the kit, request adapter, framework context, and route/action recipes.
2. Lock the starter behavior with tests so the golden path is callable from one place.
3. Expand provider, adapter, and framework recipes after the starter is stable.
4. Tighten migration and operational docs around the implemented surfaces.

## Workstreams

### 1. AuthKit Core (Top Priority)

Goal:
Deliver a single high-level API that unifies current primitives into one product-grade integration path.

Deliverables:

- `createAuthKit(config)` high-level entrypoint
- framework-neutral output contract (`handlers`, `client`, `sessionStore`, `bridge`)
- default provider and adapter wiring presets
- strict extension points for custom policy hooks

Acceptance:

- minimal setup requires one constructor and one route wiring block
- defaults are explicit and documented
- advanced behavior remains opt-in without forking internals

### 2. Security Defaults as Contract

Goal:
Turn security expectations into strict, visible contracts on the golden path.

Deliverables:

- secure default cookie posture templates per runtime mode
- refresh rotation/replay/cross-tab defaults embedded in AuthKit presets
- standard error mapping profile for public-facing responses
- policy override audit surface (`onPolicyOverride` diagnostics)

Acceptance:

- every default has test coverage
- override points are explicit, typed, and logged
- docs clearly split automatic behavior vs opt-in hardening

### 3. Adapter Productization

Goal:
Make relational adapters feel first-class and near-zero friction.

Deliverables:

- PostgreSQL/MySQL adapter migration templates (versioned SQL files)
- transaction-safe token consume patterns for verification tokens
- adapter capability probe utility (checks required methods/features)
- adapter test harness package for external adapter authors

Acceptance:

- production onboarding does not require reading internal adapter code
- capability gaps are detected before runtime auth failures
- adapter docs include concurrency and index guidance by default

### 4. Provider Experience

Goal:
Reduce provider-specific cognitive load while preserving explicitness.

Deliverables:

- provider presets with validated defaults for top migration providers
- callback contract helpers (state/nonce/code verifier lifecycle guardrails)
- provider error normalization matrix

Acceptance:

- common provider setup requires minimal provider-specific code
- callback edge cases are covered by integration tests
- provider-specific failures map to actionable errors

### 5. Migration Confidence Layer

Goal:
Make migration from Auth.js measurable, not guess-based.

Deliverables:

- migration diagnostics utility (`analyzeAuthMigration()`)
- feature parity report output (covered, partial, missing)
- cutover checklists tied to runtime assertions

Acceptance:

- teams can run diagnostics before cutover
- known gaps are reported as concrete action items
- rollback guidance is generated for high-risk paths

### 6. Framework UX Packs

Goal:
Ship opinionated framework packs for fast integration without framework lock-in in core.

Deliverables:

- Next.js (App Router) pack
- Express/Fastify pack
- React client bootstrap pack

Acceptance:

- each pack includes executable starter and contract tests
- packs consume AuthKit core, not parallel bespoke logic

## Milestones

### Milestone 1: Spine

- `createAuthKit` alpha
- one golden-path quickstart (server + client handoff)
- tests for default session lifecycle

### Milestone 2: Production Guardrails

- adapter capability probe
- versioned SQL migration templates
- security default contracts completed

### Milestone 3: Migration Confidence

- migration analyzer output
- Auth.js parity report generator
- cutover playbook integrated with diagnostics

### Milestone 4: Framework Acceleration

- Next.js/Express/Fastify packs
- full starter workflows validated in CI

## Definition Of Done

`@pureq/auth` is considered product-complete for this cycle when:

- a team can deploy a secure baseline with one high-level setup path
- adapter/provider setup does not require internal source reading
- migration risk can be assessed by a tool, not only docs
- docs, tests, and exported APIs present one coherent story

## Non-Goals (This Cycle)

- expanding long-tail social providers before AuthKit core stabilizes
- UI component library for sign-in pages
- hosted auth management features

## Execution Rules

- no new surface API without a matching quickstart snippet and test
- no "optional" security behavior without explicit default narrative
- no adapter guide without index/uniqueness/concurrency notes
- no migration claim without diagnostics coverage

## Tracking

Use this checklist as the live execution board.

### A. AuthKit Core

- [x] RFC: `createAuthKit` contract (`handlers`, `client`, `sessionStore`, `bridge`)
- [x] Implement `createAuthKit` alpha behind stable exports
- [x] Add end-to-end golden-path tests for AuthKit
- [x] Add minimal quickstart doc based on AuthKit only
- [x] Add `createAuthStarter` helper and starter guide

### B. Security Contracts

- [x] Encode default cookie/security profile presets by runtime mode
- [x] Add explicit policy override diagnostics
- [x] Add contract tests for default-vs-opt-in behavior matrix

### C. Adapter Productization

- [x] Add versioned SQL migration templates for PostgreSQL/MySQL
- [x] Add adapter capability probe utility
- [x] Add adapter harness docs for third-party adapter authors
- [x] Add integration tests for one-time token consume under concurrency assumptions

### D. Provider Experience

- [x] Add top-provider presets with validated defaults
- [x] Add callback contract helper utilities
- [x] Add provider error normalization table and tests

### E. Migration Confidence

- [x] Implement `analyzeAuthMigration()` diagnostics API
- [x] Add parity report output format
- [x] Add cutover/rollback checklist generator

### F. Framework UX Packs

- [x] Ship Next.js pack (server + client handoff)
- [x] Ship Express/Fastify pack
- [x] Ship React bootstrap pack

### G. Quality Gates

- [x] Keep `pnpm --filter @pureq/auth test:unit` green throughout
- [x] Add CI job for AuthKit golden-path smoke tests
- [x] Ensure docs index points to the new golden path first
