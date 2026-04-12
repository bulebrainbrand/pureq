import { createAuthError } from "../shared";
import type { OIDCProviderDefinition } from "../shared";

function assertNonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw createAuthError("PUREQ_OIDC_INVALID_PROVIDER", `pureq: ${label} is required`, {
      details: { label },
    });
  }

  return normalized;
}

function provider(
  name: string,
  discoveryUrl: string,
  defaultScope?: readonly string[],
  authorizationDefaults?: Readonly<Record<string, string>>,
  validateAuthorizationOptions?: OIDCProviderDefinition["validateAuthorizationOptions"]
): OIDCProviderDefinition {
  return {
    name: assertNonEmpty(name, "provider name"),
    discoveryUrl: assertNonEmpty(discoveryUrl, "discovery url"),
    ...(defaultScope ? { defaultScope } : {}),
    ...(authorizationDefaults ? { authorizationDefaults } : {}),
    ...(validateAuthorizationOptions ? { validateAuthorizationOptions } : {}),
  };
}

/**
 * Built-in OIDC provider definitions.
 * FEAT-M7: Extended with Apple, Discord, Slack, GitLab, Keycloak, Okta, Cognito, and generic.
 */
export const oidcProviders = {
  google: () =>
    provider(
      "google",
      "https://accounts.google.com/.well-known/openid-configuration",
      ["openid", "profile", "email"],
      { access_type: "offline", include_granted_scopes: "true" }
    ),
  github: () =>
    provider("github", "https://github.com/.well-known/openid-configuration", ["openid", "read:user", "user:email"]),
  microsoft: (tenant = "common") =>
    provider(
      "microsoft",
      `https://login.microsoftonline.com/${assertNonEmpty(tenant, "microsoft tenant")}/v2.0/.well-known/openid-configuration`,
      ["openid", "profile", "email"],
      { response_mode: "query" }
    ),
  auth0: (domain: string) =>
    provider(
      "auth0",
      `https://${assertNonEmpty(domain, "auth0 domain").replace(/^https?:\/\//, "")}/.well-known/openid-configuration`,
      ["openid", "profile", "email"],
      undefined,
      (options) => {
        if (options.codeChallengeMethod === "plain") {
          throw createAuthError("PUREQ_OIDC_INVALID_PROVIDER", "pureq: auth0 provider requires S256 PKCE challenge method", {
            details: { provider: "auth0", codeChallengeMethod: "plain" },
          });
        }
      }
    ),
  apple: () =>
    provider(
      "apple",
      "https://appleid.apple.com/.well-known/openid-configuration",
      ["openid", "name", "email"],
      { response_mode: "form_post" }
    ),
  discord: () =>
    provider(
      "discord",
      "https://discord.com/.well-known/openid-configuration",
      ["openid", "identify", "email"]
    ),
  slack: () =>
    provider(
      "slack",
      "https://slack.com/.well-known/openid-configuration",
      ["openid", "profile", "email"]
    ),
  gitlab: (baseUrl = "https://gitlab.com") =>
    provider(
      "gitlab",
      `${assertNonEmpty(baseUrl, "gitlab base url").replace(/\/$/, "")}/.well-known/openid-configuration`,
      ["openid", "profile", "email"]
    ),
  keycloak: (baseUrl: string, realm: string) =>
    provider(
      "keycloak",
      `${assertNonEmpty(baseUrl, "keycloak base url").replace(/\/$/, "")}/realms/${assertNonEmpty(realm, "keycloak realm")}/.well-known/openid-configuration`,
      ["openid", "profile", "email"]
    ),
  okta: (domain: string) =>
    provider(
      "okta",
      `https://${assertNonEmpty(domain, "okta domain").replace(/^https?:\/\//, "").replace(/\/$/, "")}/.well-known/openid-configuration`,
      ["openid", "profile", "email"]
    ),
  cognito: (domain: string, region?: string) => {
    const cleanDomain = assertNonEmpty(domain, "cognito domain").replace(/^https?:\/\//, "").replace(/\/$/, "");
    const discoveryBase = region
      ? `https://cognito-idp.${region}.amazonaws.com/${cleanDomain}`
      : `https://${cleanDomain}`;
    return provider(
      "cognito",
      `${discoveryBase}/.well-known/openid-configuration`,
      ["openid", "profile", "email"]
    );
  },
  /** Generic OIDC provider — pass any discovery URL. */
  generic: (name: string, discoveryUrl: string, defaultScope?: readonly string[]) =>
    provider(
      assertNonEmpty(name, "provider name"),
      assertNonEmpty(discoveryUrl, "discovery url"),
      defaultScope ?? ["openid"]
    ),
};
