/**
 * Adds localhost ↔ 127.0.0.1 variants so dev works when the UI and CORS list disagree on loopback.
 */
export function expandLocalhostVariantsInOrigins(origins: string[]): string[] {
  const normalized = new Set(
    origins.map((origin) => origin.trim()).filter(Boolean),
  );

  for (const origin of Array.from(normalized)) {
    try {
      const url = new URL(origin);
      if (url.hostname === 'localhost') {
        url.hostname = '127.0.0.1';
        normalized.add(url.origin);
      } else if (url.hostname === '127.0.0.1') {
        url.hostname = 'localhost';
        normalized.add(url.origin);
      }
    } catch {
      // Ignore malformed origin values and keep original behavior.
    }
  }

  return Array.from(normalized);
}
