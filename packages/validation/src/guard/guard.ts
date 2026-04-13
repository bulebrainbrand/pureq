import { type Result, err, ok } from "../result/result.js";
import { type ValidationError, createValidationError, VALIDATION_ERROR_CODES } from "../errors/validation-error.js";

/**
 * Guard function that validates a value.
 * Can return a boolean, Result, Promise<boolean>, or Promise<Result>.
 * - true/ok() passes validation and returns original value
 * - false/err() fails validation and returns ValidationError
 * - Exceptions are normalized to ValidationError with INTERNAL_GUARD_EXCEPTION code
 */
export type GuardFunction<T> =
  | ((value: T) => boolean | Result<T, ValidationError>)
  | ((value: T) => Promise<boolean | Result<T, ValidationError>>);

/**
 * Guard executor that can be used with pipe or pipeAsync.
 * Takes a value and returns Result or Promise<Result> depending on whether the guard is async.
 */
export type GuardExecutor<T> = (value: T) => Result<T, ValidationError> | Promise<Result<T, ValidationError>>;

const toValidationError = (name: string, cause: unknown): ValidationError =>
  createValidationError({
    code: VALIDATION_ERROR_CODES.INTERNAL_GUARD_EXCEPTION,
    message: `Guard "${name}" failed with an exception`,
    path: "/",
    cause: cause instanceof Error ? cause.message : String(cause),
  });

const toFailedGuardResult = <T>(name: string): Result<T, ValidationError> =>
  err(
    createValidationError({
      code: VALIDATION_ERROR_CODES.GUARDRAIL_FAILED,
      message: `Guard "${name}" returned false`,
      path: "/",
    })
  );

const normalizeGuardValue = async <T>(
  value: T,
  name: string,
  outcome: boolean | Result<T, ValidationError> | Promise<boolean | Result<T, ValidationError>>,
): Promise<Result<T, ValidationError>> => {
  try {
    const resolved = await outcome;

    if (typeof resolved === "boolean") {
      return resolved ? ok(value) : toFailedGuardResult<T>(name);
    }

    return resolved;
  } catch (cause) {
    return err(toValidationError(name, cause));
  }
};

/**
 * Creates a guard executor from a guard function.
 * Wraps the function to handle exceptions and normalize return values.
 * 
 * @param fn - The guard validation function
 * @param name - Optional name for error messages
 * @returns A guard executor function for use in pipe/pipeAsync
 */
export const createGuard = <T>(fn: GuardFunction<T>, name = "guard"): GuardExecutor<T> => {
  return (value: T): Result<T, ValidationError> | Promise<Result<T, ValidationError>> => {
    try {
      const result = fn(value);

      if (result instanceof Promise) {
        return normalizeGuardValue(value, name, result);
      }

      if (typeof result === "boolean") {
        return result ? ok(value) : toFailedGuardResult<T>(name);
      }

      return result;
    } catch (e) {
      return err(toValidationError(name, e));
    }
  };
};
