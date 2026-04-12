# Adapter Harness Guide

This guide explains how to validate third-party adapters against `@pureq/auth` expectations.

## Goal

Ensure custom adapters meet migration-ready behavior before production rollout.

## Capability Probe

Use `probeAdapterCapabilities(adapter)` first.

Expected levels:

- `level-a`: required + recommended methods available
- `level-b`: required methods available, some recommended methods missing
- `level-c`: required methods missing

## Contract Expectations

Required method groups:

- user: `createUser`, `getUser`, `getUserByEmail`, `updateUser`
- account: `getUserByAccount`, `linkAccount`
- session: `createSession`, `getSessionAndUser`, `updateSession`, `deleteSession`

Recommended for migration parity:

- `deleteUser`, `unlinkAccount`
- `createVerificationToken`, `useVerificationToken`

## Verification Token Semantics

`useVerificationToken` must be one-time consume.

Under concurrent attempts, only one consumer should succeed.

## Minimum Production Checks

- unique constraint on `(provider, provider_account_id)`
- deterministic session expiry behavior
- transaction-safe verification token consume path
- clear logging on adapter I/O failures

## Suggested Test Layers

1. capability probe unit tests
2. one-time consume concurrency test
3. sign-in/callback/session/sign-out integration tests
4. migration smoke tests with legacy token import
