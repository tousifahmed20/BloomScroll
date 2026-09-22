import { Router, Request, Response } from 'express';
import { config } from '../config';
import { query } from '../db';
import { getChannel } from '../youtube';
import { saveTokens } from '../tokens';
import { ingestUserChannel } from '../userIngest';
import { subscribe } from '../websub';

/**
 * Per-account channels. Everything here is ISOLATED to one user:
 * stored in user_channels / user_videos, surfaced only in that user's feed,
 * and NEVER merged into the global catalogue.
 *
 * OAuth is used only to link the user's Google/YouTube account (e.g. to import
 * the channels they follow). Adding a public channel by ID needs no OAuth.
 */
export const userRouter = Router();

// --- OAuth link (optional) -------------------------------------------------
// Step 1: send the user to Google's consent screen.
userRouter.get('/auth/google', (req: Request, res: Response) => {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: config.oauth.clientId,
    redirect_uri: config.oauth.redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    // Narrowest scope needed to read the user's own YouTube data.
    scope: 'https://www.googleapis.com/auth/youtube.readonly',
    state: String(req.query.userId ?? ''),
  }).toString();
  res.redirect(url.toString());
});

// Step 2: exchange the code for tokens.
userRouter.get('/auth/google/callback', async (req: Request, res: Response) => {
  const code = String(req.query.code ?? '');
  const userId = String(req.query.state ?? '');
  if (!code) return res.status(400).send('Missing code');

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.oauth.clientId,
      client_secret: config.oauth.clientSecret,
      redirect_uri: config.oauth.redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  const tokens = await tokenRes.json();
  await query(`INSERT INTO users (id) VALUES ($1) ON CONFLICT DO NOTHING`, [userId]);
  await saveTokens(userId, tokens);
  res.json({ linked: true, hasRefreshToken: Boolean(tokens.refresh_token) });
});

// --- Add a channel to the user's own list (isolated) -----------------------
// Body: { userId, channelId, themeId }  — themeId must be one of YOUR themes.
userRouter.post('/me/channels', async (req: Request, res: Response) => {
  const { userId, channelId, themeId } = req.body ?? {};
  if (!userId || !channelId) return res.status(400).json({ error: 'userId and channelId required' });

  // Guard: the user may only file a channel under an EXISTING theme.
  // Note: this is user-assignment, not automated topical validation — the API
  // cannot detect a channel's actual subject.
  if (themeId != null) {
    const [t] = await query(`SELECT id FROM themes WHERE id = $1`, [themeId]);
    if (!t) return res.status(400).json({ error: 'Unknown theme' });
  }

  await query(`INSERT INTO users (id) VALUES ($1) ON CONFLICT DO NOTHING`, [userId]);

  const { title, uploadsPlaylistId } = await getChannel(channelId);
  await query(
    `INSERT INTO user_channels (user_id, channel_id, title, uploads_playlist_id, theme_id)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (user_id, channel_id) DO UPDATE SET theme_id = EXCLUDED.theme_id`,
    [userId, channelId, title, uploadsPlaylistId, themeId ?? null],
  );

  // Ingest a shallow slice into the user's ISOLATED table.
  const ingested = await ingestUserChannel(userId, uploadsPlaylistId);

  // Keep it fresh for free: WebSub notifications fan out to this user in the callback.
  try { await subscribe(channelId); } catch (e) { console.error('WebSub subscribe failed:', e); }

  res.json({ added: title, ingested });
});

// The user's personal feed (isolated).
userRouter.get('/me/videos', async (req: Request, res: Response) => {
  const userId = String(req.query.userId ?? '');
  const rows = await query(
    `SELECT video_id AS id, title, duration_sec, content_type, thumbnail_url, published_at
       FROM user_videos WHERE user_id = $1
      ORDER BY published_at DESC LIMIT 50`,
    [userId],
  );
  res.json({ items: rows });
});
