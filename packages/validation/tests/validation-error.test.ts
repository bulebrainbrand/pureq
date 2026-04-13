import { describe, expect, it } from "vitest";
import {
  VALIDATION_ERROR_CODES,
  createValidationError,
  invalidFormatError,
  invalidTypeError,
  requiredError,
} from "../src/errors/validation-error";

describe("ValidationError model", () => {
  it("creates canonical errors with deterministic shape", () => {
    const output = createValidationError({
      code: VALIDATION_ERROR_CODES.OUT_OF_RANGE,
      message: "Out of allowed range",
      path: "/age",
      details: { min: 18 },
      cause: "value_below_min",
    });

    expect(output).toEqual({
      code: "out_of_range",
      message: "Out of allowed range",
      path: "/age",
      details: { min: 18 },
      cause: "value_below_min",
    });
  });

  it("creates invalid_type errors with expected metadata", () => {
    const output = invalidTypeError({
      path: "/email",
      expected: "string",
      received: "number",
    });

    expect(output.code).toBe(VALIDATION_ERROR_CODES.INVALID_TYPE);
    expect(output.path).toBe("/email");
    expect(output.details).toEqual({
      expected: "string",
      received: "number",
    });
  });

  it("creates invalid_format and required errors", () => {
    const formatError = invalidFormatError({
      path: "/id",
      format: "uuid",
      value: "not-uuid",
    });
    const missingError = requiredError("/name");

    expect(formatError.code).toBe(VALIDATION_ERROR_CODES.INVALID_FORMAT);
    expect(missingError.code).toBe(VALIDATION_ERROR_CODES.REQUIRED);
  });
});