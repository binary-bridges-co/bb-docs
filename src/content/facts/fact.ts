/**
 * The shape of one fact: a value and the `repo/path:line` it was read from. Shared by every fact module
 * (`sign.ts` and the modules it re-exports), so a fact means the same thing wherever it is declared.
 */
export interface Fact<T = number> {
  readonly value: T;
  /** `repo/path:line` where the value was read. */
  readonly source: string;
}

export const fact = <T>(value: T, source: string): Fact<T> => ({ value, source });
