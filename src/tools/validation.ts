import { checkDuplicateIds } from "../sanitize.js";

export function assertNonEmptyArray(name: string, items: unknown[]): void {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(`${name} must contain at least one item.`);
  }
}

export function assertArrayLength(name: string, items: unknown[], expected: number): void {
  if (items.length !== expected) {
    throw new Error(`${name} must contain exactly ${expected} item(s).`);
  }
}

export function assertUniqueIds(name: string, ids: string[]): void {
  const dupeError = checkDuplicateIds(ids);
  if (dupeError) {
    throw new Error(dupeError);
  }
}

export function assertReferencesExist(
  subject: string,
  refs: string[],
  validIds: Iterable<string>,
  targetName: string
): void {
  const allowed = new Set(validIds);
  const missing = [...new Set(refs.filter((ref) => !allowed.has(ref)))];
  if (missing.length > 0) {
    throw new Error(`${subject} reference unknown ${targetName}(s): ${missing.join(", ")}`);
  }
}

export function assertFiniteNumber(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number.`);
  }
}

export function assertNumberInRange(
  name: string,
  value: number,
  min: number,
  max: number,
  integer: boolean = false
): void {
  assertFiniteNumber(name, value);
  if (integer && !Number.isInteger(value)) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }
  if (value < min || value > max) {
    throw new Error(`${name} must be between ${min} and ${max}.`);
  }
}

export function assertMatrixDimensions(
  name: string,
  values: number[][],
  expectedRows: number,
  expectedColumns: number
): void {
  if (values.length !== expectedRows) {
    throw new Error(`${name} must contain ${expectedRows} row(s) to match the provided labels.`);
  }

  for (let rowIndex = 0; rowIndex < values.length; rowIndex++) {
    if (values[rowIndex].length !== expectedColumns) {
      throw new Error(
        `${name}[${rowIndex}] must contain ${expectedColumns} column(s) to match the provided labels.`
      );
    }

    for (let colIndex = 0; colIndex < values[rowIndex].length; colIndex++) {
      assertFiniteNumber(`${name}[${rowIndex}][${colIndex}]`, values[rowIndex][colIndex]);
    }
  }
}
