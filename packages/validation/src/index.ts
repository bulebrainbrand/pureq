export type { Result, Ok, Err } from "./result/result.js";
export { ok, err, isOk, isErr, map, mapError, combine, pipe, pipeAsync } from "./result/result.js";

export type { ValidationError, ValidationErrorCode } from "./errors/validation-error.js";
export {
  VALIDATION_ERROR_CODES,
  createValidationError,
  invalidTypeError,
  invalidFormatError,
  forbiddenKeyError,
  requiredError,
} from "./errors/validation-error.js";

export type { GuardrailRule, ValidationPolicy } from "./policy/types.js";
export { DEFAULT_VALIDATION_POLICY, mergeValidationPolicy } from "./policy/merge.js";
export { decodeJsonPointer, encodeJsonPointer, normalizePathToJsonPointer } from "./policy/json-pointer.js";

export type { GuardFunction, GuardExecutor } from "./guard/guard.js";
export { createGuard } from "./guard/guard.js";

export type { DeniedDrop, StringifyOptions } from "./stringify/types.js";
export { stringify } from "./stringify/stringify.js";

export type {
  Schema,
  PolicySchema,
  ParseResult,
  ValidationResult,
  ValidationSuccess,
  Infer,
} from "./schema/base.js";
export { ObjectSchema } from "./schema/composite/object.js";
export { ArraySchema } from "./schema/composite/array.js";
export { StringSchema } from "./schema/primitive/string.js";
export { NumberSchema } from "./schema/primitive/number.js";
export { BooleanSchema } from "./schema/primitive/boolean.js";
export { v } from "./schema/factory.js";