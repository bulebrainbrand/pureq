import { describe, expect, it } from "vitest";
import { combine, err, mapError, ok } from "../src/result/result";

describe("Result utilities", () => {
  it("combine returns all values when all results are ok", () => {
    const input = [ok(1), ok(2), ok(3)];
    const output = combine(input);

    expect(output.ok).toBe(true);
    if (output.ok) {
      expect(output.value).toEqual([1, 2, 3]);
    }
  });

  it("combine accumulates all errors when any result is err", () => {
    const input = [ok(1), err("a"), err("b")];
    const output = combine(input);

    expect(output.ok).toBe(false);
    if (!output.ok) {
      expect(output.error).toEqual(["a", "b"]);
    }
  });

  it("mapError rewrites the error while preserving the result state", () => {
    const source = err({ reason: "invalid" });
    const mapped = mapError(source, (input) => ({ ...input, code: "E_INVALID" }));

    expect(mapped.ok).toBe(false);
    if (!mapped.ok) {
      expect(mapped.error).toEqual({ reason: "invalid", code: "E_INVALID" });
    }
  });
});