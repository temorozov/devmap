import { createHmac, timingSafeEqual } from 'crypto';

type SignedPayload = { o: string; exp: number };

/** .env often wraps secrets in quotes; Docker can pass them through. */
function normalizeOAuthStateSecret(secret: string): string {
  return secret.trim().replace(/^["']+|["']+$/g, '');
}

/** Puts return origin into OAuth `state` so providers echo it back (cookies are unreliable across OAuth redirects). */
export function signOAuthReturnState(origin: string, secret: string): string {
  const key = normalizeOAuthStateSecret(secret);
  const body: SignedPayload = { o: origin, exp: Date.now() + 15 * 60 * 1000 };
  const payloadB64 = Buffer.from(JSON.stringify(body), 'utf8').toString('base64url');
  const sig = createHmac('sha256', key).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function verifyOAuthReturnState(token: string, secret: string): string | undefined {
  const key = normalizeOAuthStateSecret(secret);
  const dot = token.indexOf('.');
  if (dot <= 0) return undefined;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!payloadB64 || !sig) return undefined;

  const expectedSig = createHmac('sha256', key).update(payloadB64).digest('base64url');
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return undefined;

  let parsed: SignedPayload;
  try {
    parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as SignedPayload;
  } catch {
    return undefined;
  }
  if (typeof parsed.o !== 'string' || typeof parsed.exp !== 'number') return undefined;
  if (parsed.exp < Date.now()) return undefined;
  try {
    return new URL(parsed.o).origin;
  } catch {
    return undefined;
  }
}

export function readOAuthStateQuery(raw: unknown): string | undefined {
  let s: string | undefined;
  if (typeof raw === 'string' && raw) s = raw;
  else if (Array.isArray(raw) && typeof raw[0] === 'string') s = raw[0];
  else return undefined;
  try {
    for (let i = 0; i < 3; i++) {
      const next = decodeURIComponent(s);
      if (next === s) break;
      s = next;
    }
  } catch {
    return undefined;
  }
  return s || undefined;
}
