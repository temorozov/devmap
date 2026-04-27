import { getEnvList, getOptionalEnv } from '../config/env';
import { expandLocalhostVariantsInOrigins } from '../config/cors-origins';

function collectSeedUrlStrings(): string[] {
  const seeds: string[] = [...getEnvList('CORS_ORIGINS')];
  const fe = getOptionalEnv('FRONTEND_URL');
  if (fe) seeds.push(fe);
  const oauth = getOptionalEnv('OAUTH_FRONTEND_REDIRECT_URL');
  if (oauth) seeds.push(oauth);
  return seeds;
}

/** Origins the browser may return to after OAuth (must stay in sync with real frontends). */
export function getAllowedOAuthReturnOrigins(): Set<string> {
  const origins = new Set<string>();
  for (const item of collectSeedUrlStrings()) {
    try {
      origins.add(new URL(item).origin);
    } catch {
      /* skip malformed */
    }
  }
  return new Set(expandLocalhostVariantsInOrigins([...origins]));
}

export function parseReturnOriginQuery(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  let s = raw.trim();
  try {
    for (let i = 0; i < 3; i++) {
      const next = decodeURIComponent(s);
      if (next === s) break;
      s = next;
    }
    return new URL(s).origin;
  } catch {
    return undefined;
  }
}

function isLoopbackDevOrigin(origin: string): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  try {
    const u = new URL(origin);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export function isOAuthReturnOriginAllowed(origin: string): boolean {
  if (getAllowedOAuthReturnOrigins().has(origin)) return true;
  return isLoopbackDevOrigin(origin);
}
