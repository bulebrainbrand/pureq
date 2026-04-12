import { describe, expect, it } from "vitest";
import { createTopProviderPreset, listTopProviderPresets } from "../src/providers";

describe("provider presets", () => {
  it("creates top provider presets with validated defaults", () => {
    const google = createTopProviderPreset("google");
    expect(google.name).toBe("google");
    expect(google.defaultScope).toEqual(expect.arrayContaining(["openid"]));

    const microsoft = createTopProviderPreset("microsoft", { tenant: "common" });
    expect(microsoft.discoveryUrl).toContain("common");

    const auth0 = createTopProviderPreset("auth0", { domain: "tenant.example.com" });
    expect(auth0.discoveryUrl).toContain("tenant.example.com");

    const okta = createTopProviderPreset("okta", { domain: "dev-12345.okta.com" });
    expect(okta.discoveryUrl).toContain("okta.com");

    const keycloak = createTopProviderPreset("keycloak", { baseUrl: "https://id.example.com", realm: "main" });
    expect(keycloak.discoveryUrl).toContain("/realms/main/");

    const cognito = createTopProviderPreset("cognito", { domain: "pool-id", region: "ap-northeast-1" });
    expect(cognito.discoveryUrl).toContain("cognito-idp.ap-northeast-1.amazonaws.com");

    const generic = createTopProviderPreset("generic", {
      providerName: "custom-idp",
      discoveryUrl: "https://id.example.com/.well-known/openid-configuration",
    });
    expect(generic.name).toBe("custom-idp");
  });

  it("rejects invalid preset configuration", () => {
    expect(() => createTopProviderPreset("microsoft", { tenant: "   " })).toThrow(/tenant/i);
    expect(() => createTopProviderPreset("auth0", { domain: "" })).toThrow(/domain/i);
    expect(() => createTopProviderPreset("okta", { domain: "" })).toThrow(/domain/i);
    expect(() => createTopProviderPreset("keycloak", { baseUrl: "", realm: "main" })).toThrow(/baseUrl/i);
    expect(() => createTopProviderPreset("generic", { providerName: "custom", discoveryUrl: "" })).toThrow(/discoveryUrl/i);
  });

  it("lists all top provider presets", () => {
    const names = listTopProviderPresets();
    expect(names).toEqual(
      expect.arrayContaining([
        "google",
        "github",
        "microsoft",
        "auth0",
        "apple",
        "okta",
        "keycloak",
        "cognito",
        "gitlab",
        "discord",
        "slack",
        "generic",
      ])
    );
  });
});
