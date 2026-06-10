/**
 * Type guard: Check if value is a non-array object
 */
export function asRecord(
  value: unknown
): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Type guard: Check if value is a finite number
 */
export function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

/**
 * Type guard: Check if value is a string
 */
export function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/**
 * Type guard: Check if value is an array
 */
export function asArray<T = unknown>(value: unknown): T[] | null {
  return Array.isArray(value) ? (value as T[]) : null;
}

/**
 * Type guard: Check if value is a boolean
 */
export function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

/**
 * Type guard: Check if value is an object with specific keys
 */
export function asObjectWithKeys<K extends string>(
  value: unknown,
  keys: K[]
): Partial<Record<K, unknown>> | null {
  const record = asRecord(value);
  if (!record) return null;

  const result: Partial<Record<K, unknown>> = {};
  for (const key of keys) {
    if (key in record) {
      result[key] = record[key];
    }
  }
  return result;
}
