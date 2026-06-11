// =============================================================================
// Shared Brivo Access API auth helper.
// One place to read credentials and obtain an OAuth access token so every
// route behaves consistently. Docs: https://apidocs.brivo.com/access
// =============================================================================

const AUTH_BASE = process.env.BRIVO_AUTH_BASE || 'https://auth.brivo.com';
export const BRIVO_API_BASE = process.env.BRIVO_API_BASE || 'https://api.brivo.com';

// The "Basic" header is base64(CLIENT_ID:CLIENT_SECRET). Accept either the raw
// client id + secret (preferred) or a pre-encoded BRIVO_AUTH_BASIC value.
export function getBrivoBasic(): string | null {
  const clientId = (process.env.BRIVO_CLIENT_ID || '').trim();
  const clientSecret = (process.env.BRIVO_CLIENT_SECRET || '').trim();
  if (clientId && clientSecret) {
    return Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  }
  const preEncoded = (process.env.BRIVO_AUTH_BASIC || '').trim();
  return preEncoded || null;
}

export interface BrivoTokenResult {
  ok: boolean;
  token?: string;
  status?: number;
  step?: 'config' | 'login';
  error?: string;
  detail?: unknown;
}

// Performs the password-grant token request, including the required api-key
// header. Returns a discriminated result instead of throwing.
export async function getBrivoToken(): Promise<BrivoTokenResult> {
  const basic = getBrivoBasic();
  const apiKey = (process.env.BRIVO_API_KEY || '').trim();
  const username = process.env.BRIVO_USERNAME || '';
  const password = process.env.BRIVO_PASSWORD || '';

  const missing: string[] = [];
  if (!basic) missing.push('BRIVO_CLIENT_ID + BRIVO_CLIENT_SECRET (or BRIVO_AUTH_BASIC)');
  if (!apiKey) missing.push('BRIVO_API_KEY');
  if (!username) missing.push('BRIVO_USERNAME');
  if (!password) missing.push('BRIVO_PASSWORD');
  if (missing.length) {
    return { ok: false, status: 400, step: 'config', error: `Missing env vars: ${missing.join(', ')}` };
  }

  let res: Response;
  try {
    res = await fetch(`${AUTH_BASE}/oauth/token`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Authorization': `Basic ${basic}`,
        'api-key': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': '*/*',
      },
      body: new URLSearchParams({ grant_type: 'password', username, password }).toString(),
    });
  } catch (e: any) {
    return { ok: false, status: 502, step: 'login', error: 'Could not reach Brivo auth server', detail: e?.message };
  }

  const text = await res.text();
  if (!res.ok) {
    return { ok: false, status: res.status, step: 'login', error: 'Brivo rejected login', detail: safeParse(text) };
  }

  const data = safeParse(text);
  const token = (data as any)?.access_token;
  if (!token) {
    return { ok: false, status: 502, step: 'login', error: 'No access_token returned', detail: data };
  }
  return { ok: true, token };
}

// Standard headers for calls to api.brivo.com.
export function brivoApiHeaders(token: string): Record<string, string> {
  return {
    'Authorization': `bearer ${token}`,
    'api-key': (process.env.BRIVO_API_KEY || '').trim(),
  };
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
