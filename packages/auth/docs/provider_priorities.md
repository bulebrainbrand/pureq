# Provider Coverage Priorities

This document ranks provider coverage work so parity decisions are explicit.

## Priority Model

- P0: required for most migrations and broad production impact
- P1: common in enterprise or regional use, but not universal
- P2: long-tail providers and deployment-specific variants

## Current Built-In Coverage

The package already exposes the following provider surfaces:

- credentials: `credentialsProvider`
- email: `emailProvider`
- OIDC presets: Google, GitHub, Microsoft, Auth0, Apple, Discord, Slack, GitLab, Keycloak, Okta, Cognito, generic OIDC
- top preset helper: `createTopProviderPreset` + `listTopProviderPresets`

## Ranked Priorities

### P0 (Ship/maintain first)

1. Google OIDC
2. Microsoft OIDC (multi-tenant and single-tenant variants)
3. GitHub OIDC
4. Auth0 OIDC
5. Credentials provider
6. Email provider

Rationale:

- highest migration overlap with conventional Auth.js deployments
- highest blast radius when callback or token exchange behavior changes
- core sign-in paths for both enterprise and developer-first products

### P1 (Next wave)

1. Apple OIDC
2. Okta OIDC
3. Keycloak OIDC
4. Cognito OIDC
5. GitLab OIDC

Rationale:

- high enterprise relevance
- provider-specific metadata and callback quirks are common
- often paired with stricter compliance and incident-response requirements

### P2 (Long tail and ecosystem expansion)

1. Discord OIDC
2. Slack OIDC
3. Generic OIDC hardening scenarios

Rationale:

- important but lower default migration frequency
- better handled after P0/P1 compatibility evidence is stable

## Validation Checklist Per Provider

- discovery document parsing and required endpoint checks
- authorization URL option validation and provider-specific constraints
- callback error handling and state/nonce validation behavior
- token exchange and refresh error semantics
- replay protection behavior under repeated callback payloads
- docs examples and troubleshooting notes

## Notes

- Priority rank is about validation order, not feature availability.
- Generic OIDC should remain available as an escape hatch, but not as a substitute for provider-specific contract tests.
