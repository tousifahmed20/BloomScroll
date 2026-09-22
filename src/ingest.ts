import { query } from './db';
import { getChannel, listUploadIds, getVideos, VideoMeta } from './youtube';

/**
 * Onboard a curated channel into the GLOBAL catalogue and tag it with themes.
 * `depth` pages of the uploads playlist (50 videos each) are ingested.
 * Cost: ~1 (channel) + depth (playlist) + ceil(n/50) (videos) units.
 */
export async function onboardChannel(
  channelId: string,
  themeIds: number[],
  depth = 1,
): Promise<number> {
  const { title, uploadsPlaylistId } = await getChannel(channelId);

  await query(
    `INSERT INTO channels (id, title, uploads_playlist_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title,
       uploads_playlist_id = EXCLUDED.uploads_playlist_id`,
    [channelId, title, uploadsPlaylistId],
  );

  for (const themeId of themeIds) {
    await query(
      `INSERT INTO channel_themes (channel_id, theme_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [channelId, themeId],
    );
  }

  // Collect IDs across `depth` pages.
  let ids: string[] = [];
  let pageToken: string | undefined;
  for (let p = 0; p < depth; p++) {
    const page = await listUploadIds(uploadsPlaylistId, pageToken);
    ids = ids.concat(page.ids);
    pageToken = page.nextPageToken;
    if (!pageToken) break;
  }

  const videos = await getVideos(ids);
  for (const v of videos) await upsertVideo(v, themeIds);
  return videos.length;
}

/** Insert/refresh a single video and its theme tags (themes inherited from channel). */
export async function upsertVideo(v: VideoMeta, themeIds: number[]): Promise<void> {
  await query(
    `INSERT INTO videos
       (id, channel_id, title, description, duration_sec, content_type,
        thumbnail_url, published_at, view_count, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title, description = EXCLUDED.description,
       view_count = EXCLUDED.view_count, updated_at = now()`,
    [
      v.id, v.channelId, v.title, v.description, v.durationSec,
      v.contentType, v.thumbnailUrl, v.publishedAt, v.viewCount,
    ],
  );
  for (const themeId of themeIds) {
    await query(
      `INSERT INTO video_themes (video_id, theme_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [v.id, themeId],
    );
  }
}

/** Look up which global themes a channel is tagged with (used by the WebSub handler). */
export async function themesForChannel(channelId: string): Promise<number[]> {
  const rows = await query<{ theme_id: number }>(
    `SELECT theme_id FROM channel_themes WHERE channel_id = $1`,
    [channelId],
  );
  return rows.map((r) => r.theme_id);
}
