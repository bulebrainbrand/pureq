export type Ok<T> = { ok: true; value: T };
export type Err<E> = { ok: false; error: E };

export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });

export const err = <E>(error: E): Err<E> => ({ ok: false, error });

export const isOk = <T, E>(value: Result<T, E>): value is Ok<T> => value.ok;

export const isErr = <T, E>(value: Result<T, E>): value is Err<E> => !value.ok;

export const map = <T, E, U>(value: Result<T, E>, mapper: (input: T) => U): Result<U, E> => {
  if (isErr(value)) {
    return value;
  }
  return ok(mapper(value.value));
};

export const mapError = <T, E, U>(value: Result<T, E>, mapper: (input: E) => U): Result<T, U> => {
  if (isOk(value)) {
    return value;
  }
  return err(mapper(value.error));
};

export const combine = <T, E>(values: readonly Result<T, E>[]): Result<T[], E[]> => {
  const collectedValues: T[] = [];
  const collectedErrors: E[] = [];

  for (const value of values) {
    if (isOk(value)) {
      collectedValues.push(value.value);
      continue;
    }
    collectedErrors.push(value.error);
  }

  if (collectedErrors.length > 0) {
    return err(collectedErrors);
  }

  return ok(collectedValues);
};

export const pipe = <T, E>(
  initial: Result<T, E>,
  ...steps: Array<(value: T) => Result<T, E>>
): Result<T, E> => {
  if (isErr(initial)) {
    return initial;
  }

  let current: Result<T, E> = initial;

  for (const step of steps) {
    if (isErr(current)) {
      return current;
    }
    current = step(current.value);
  }

  return current;
};

/**
 * Asynchronous version of pipe that can handle steps returning Promise<Result>.
 * Useful for guards with async validation functions.
 * Short-circuits on first failure.
 * 
 * @param initial - The initial Result
 * @param steps - Array of functions that can be sync or async
 * @returns Promise<Result> after applying all steps or short-circuiting on first error
 */
export const pipeAsync = async <T, E>(
  initial: Result<T, E>,
  ...steps: Array<(value: T) => Result<T, E> | Promise<Result<T, E>>>
): Promise<Result<T, E>> => {
  if (isErr(initial)) {
    return initial;
  }

  let current: Result<T, E> = initial;

  for (const step of steps) {
    if (isErr(current)) {
      return current;
    }
    const result = step(current.value);
    current = result instanceof Promise ? await result : result;
  }

  return current;
};