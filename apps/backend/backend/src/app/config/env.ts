export function getEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getEnvList(name: string): string[] {
  return getEnv(name)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}
