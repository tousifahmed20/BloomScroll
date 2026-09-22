import { config } from './config';
import { query } from './db';

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
}

/** TODO #1 resolved: persist tokens server-side, keyed by userId. */
export async function saveTokens(userId: string, t: TokenResponse): Promise<void> {
  const expiresAt = t.expires_in ? new Date(Date.now() + t.expires_in * 1000) : null;
  await query(
    `INSERT INTO user_oauth_tokens (user_id, refresh_token, access_token, expires_at, scope, updated_at)
     VALUES ($1,$2,$3,$4,$5, now())
     ON CONFLICT (user_id) DO UPDATE SET
       -- keep the existing refresh_token if Google didn't send a new one
       refresh_token = COALESCE(EXCLUDED.refresh_token, user_oauth_tokens.refresh_token),
       access_token  = EXCLUDED.access_token,
       expires_at    = EXCLUDED.expires_at,
       scope         = EXCLUDED.scope,
       updated_at    = now()`,
    [userId, t.refresh_token ?? null, t.access_token ?? null, expiresAt, t.scope ?? null],
  );
}

/** Return a valid access token, refreshing via the stored refresh_token if expired. */
export async function getAccessToken(userId: string): Promise<string | null> {
  const [row] = await query<{ access_token: string; refresh_token: string; expires_at: Date }>(
    `SELECT access_token, refresh_token, expires_at FROM user_oauth_tokens WHERE user_id = $1`,
    [userId],
  );
  if (!row) return null;

  const stillValid = row.expires_at && new Date(row.expires_at).getTime() - Date.now() > 60_000;
  if (stillValid && row.access_token) return row.access_token;
  if (!row.refresh_token) return null;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.oauth.clientId,
      client_secret: config.oauth.clientSecret,
      refresh_token: row.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const t = (await res.json()) as TokenResponse;
  if (!t.access_token) return null;
  await saveTokens(userId, t); // refresh_token usually absent here; COALESCE keeps the old one
  return t.access_token;
}
