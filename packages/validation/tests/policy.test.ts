import { describe, expect, it } from "vitest";
import { DEFAULT_VALIDATION_POLICY, mergeValidationPolicy } from "../src/policy/merge";

describe("policy merge", () => {
  it("keeps defaults when no overrides are given", () => {
    const merged = mergeValidationPolicy(DEFAULT_VALIDATION_POLICY, {});
    expect(merged).toEqual(DEFAULT_VALIDATION_POLICY);
  });

  it("applies child override, scope union, and pii OR", () => {
    const parent = {
      redact: "none" as const,
      pii: false,
      scope: ["a", "b"],
      guardrails: [{ name: "g1" }],
      onDenied: "error" as const,
    };

    const child = {
      redact: "mask" as const,
      pii: true,
      scope: ["b", "c"],
      guardrails: [{ name: "g2" }],
      onDenied: "drop" as const,
    };

    const merged = mergeValidationPolicy(parent, child);

    expect(merged).toEqual({
      redact: "mask",
      pii: true,
      scope: ["a", "b", "c"],
      guardrails: [{ name: "g1" }, { name: "g2" }],
      onDenied: "drop",
    });
  });
});