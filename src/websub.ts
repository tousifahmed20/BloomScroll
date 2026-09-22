import { Router, Request, Response } from 'express';
import { XMLParser } from 'fast-xml-parser';
import { config } from './config';
import { getVideos } from './youtube';
import { upsertVideo, themesForChannel } from './ingest';
import { upsertUserVideo, usersForChannel } from './userIngest';

const TOPIC = (channelId: string) =>
  `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channelId}`;

/**
 * Subscribe a channel to WebSub push. Cost: ZERO YouTube quota units.
 * YouTube will POST our callback whenever the channel uploads/edits a video.
 * Leases expire (~5 days) — re-run this on a schedule to renew.
 */
export async function subscribe(channelId: string): Promise<void> {
  const callback = `${config.publicBaseUrl}/websub/callback`;
  const body = new URLSearchParams({
    'hub.mode': 'subscribe',
    'hub.topic': TOPIC(channelId),
    'hub.callback': callback,
    'hub.verify': 'async',
    'hub.secret': config.websubSecret,
  });
  const res = await fetch(config.websubHub, { method: 'POST', body });
  if (!res.ok && res.status !== 202) {
    throw new Error(`WebSub subscribe failed (${res.status}): ${await res.text()}`);
  }
}

export const websubRouter = Router();

// Hub verification handshake: echo hub.challenge.
websubRouter.get('/callback', (req: Request, res: Response) => {
  const challenge = req.query['hub.challenge'];
  if (challenge) return res.status(200).send(String(challenge));
  res.sendStatus(400);
});

// Upload notification (Atom XML). Enrich the new video ID and store it.
websubRouter.post('/callback', async (req: Request, res: Response) => {
  res.sendStatus(204); // ack fast; process after
  try {
    const xml = req.body?.toString?.('utf8') ?? String(req.body ?? '');
    const parsed = new XMLParser({ ignoreAttributes: false }).parse(xml);
    const entry = parsed?.feed?.entry;
    if (!entry) return;
    const videoId: string | undefined = entry['yt:videoId'];
    const channelId: string | undefined = entry['yt:channelId'];
    if (!videoId || !channelId) return;

    const [video] = await getVideos([videoId]); // 1 unit
    if (!video) return;

    // Global catalogue: write only if this is a curated (theme-tagged) channel.
    const themeIds = await themesForChannel(channelId);
    if (themeIds.length > 0) await upsertVideo(video, themeIds);

    // Per-account: fan out to every user who added this channel (isolated).
    const userIds = await usersForChannel(channelId);
    for (const userId of userIds) await upsertUserVideo(userId, video);
  } catch (err) {
    console.error('WebSub notification error:', err);
  }
});
