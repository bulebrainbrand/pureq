import { describe, expect, it } from "vitest";
import { validateProviderCallbackContract } from "../src/providers";

describe("provider callback contract", () => {
  it("parses callback and enforces code verifier contract", () => {
    const result = validateProviderCallbackContract({
      provider: "google",
      callback: "?code=abc123&state=s1",
      expectedState: "s1",
      requireCodeVerifier: true,
      codeVerifier: "verifier-1",
    });

    expect(result).toMatchObject({
      provider: "google",
      code: "abc123",
      state: "s1",
    });
  });

  it("throws structured error when code verifier is required but missing", () => {
    expect(() =>
      validateProviderCallbackContract({
        provider: "google",
        callback: "?code=abc123&state=s1",
        expectedState: "s1",
        requireCodeVerifier: true,
      })
    ).toThrow(/codeVerifier/i);
  });
});
