import { describe, expect, it } from "vitest";
import { normalizeProviderError, PROVIDER_ERROR_NORMALIZATION_TABLE } from "../src/providers";

describe("provider error normalization", () => {
  it("maps known provider errors to normalized output", () => {
    const known = normalizeProviderError({ code: "PUREQ_OIDC_TOKEN_EXCHANGE_FAILED" });
    expect(known).toMatchObject({
      code: "PUREQ_OIDC_TOKEN_EXCHANGE_FAILED",
      status: 502,
      retriable: true,
    });

    expect(PROVIDER_ERROR_NORMALIZATION_TABLE.PUREQ_OIDC_CALLBACK_ERROR?.status).toBe(400);
  });

  it("returns fallback normalization for unknown errors", () => {
    const unknown = normalizeProviderError({ code: "SOME_UNKNOWN_ERROR" });
    expect(unknown).toMatchObject({
      code: "SOME_UNKNOWN_ERROR",
      status: 500,
      retriable: false,
    });
  });
});
