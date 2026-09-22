import { query } from './db';
import { listUploadIds, getVideos, VideoMeta } from './youtube';

/** Insert one video into a user's ISOLATED table. */
export async function upsertUserVideo(userId: string, v: VideoMeta): Promise<void> {
  await query(
    `INSERT INTO user_videos
       (user_id, video_id, channel_id, title, duration_sec, content_type, thumbnail_url, published_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (user_id, video_id) DO NOTHING`,
    [userId, v.id, v.channelId, v.title, v.durationSec, v.contentType, v.thumbnailUrl, v.publishedAt],
  );
}

/** Backfill a shallow slice of a channel into a user's isolated table. */
export async function ingestUserChannel(userId: string, uploadsPlaylistId: string): Promise<number> {
  const { ids } = await listUploadIds(uploadsPlaylistId);
  const videos = await getVideos(ids);
  for (const v of videos) await upsertUserVideo(userId, v);
  return videos.length;
}

/** All users who added a given channel (used to fan out WebSub notifications). */
export async function usersForChannel(channelId: string): Promise<string[]> {
  const rows = await query<{ user_id: string }>(
    `SELECT user_id FROM user_channels WHERE channel_id = $1`,
    [channelId],
  );
  return rows.map((r) => r.user_id);
}
