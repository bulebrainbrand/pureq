import type { ValidationError } from "../errors/validation-error.js";
import type { Result } from "../result/result.js";
import type { ValidationPolicy } from "../policy/types.js";

export type ValidationSuccess<T> = {
  data: T;
  policyMap: Record<string, ValidationPolicy>;
  metadata: ValidationPolicy;
};

export type ValidationResult<T> = Result<ValidationSuccess<T>, ValidationError>;

export type ParseResult<T> = ValidationResult<T>;

export interface PolicySchema<T> {
  readonly type: T;
  readonly metadata: ValidationPolicy;
  parse(input: unknown, path?: string): ParseResult<T>;
  policy(metadata: ValidationPolicy): PolicySchema<T>;
}

export type Schema<T> = PolicySchema<T>;

export type Infer<TSchema extends Schema<unknown>> = TSchema["type"];