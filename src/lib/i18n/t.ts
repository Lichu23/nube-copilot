import { defaultLocale, getMessages, type Locale } from "./messages";

type MessageTree = ReturnType<typeof getMessages>;

export function t(
  path: string,
  locale: Locale = defaultLocale,
  params?: Record<string, string | number>,
): string {
  const segments = path.split(".");
  let current: unknown = getMessages(locale) as MessageTree;

  for (const segment of segments) {
    if (!current || typeof current !== "object" || !(segment in current)) {
      return path;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  if (typeof current !== "string") {
    return path;
  }

  if (!params) {
    return current;
  }

  return current.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
}
