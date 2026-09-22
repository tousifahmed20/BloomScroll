import { config, SHORT_MAX_SECONDS } from './config';

const API = 'https://www.googleapis.com/youtube/v3';

export interface VideoMeta {
  id: string;
  channelId: string;
  title: string;
  description: string;
  durationSec: number;
  contentType: 'short' | 'long';
  thumbnailUrl: string;
  publishedAt: string;
  viewCount: number;
}

async function get(path: string, params: Record<string, string>): Promise<any> {
  const url = new URL(`${API}/${path}`);
  url.search = new URLSearchParams({ ...params, key: config.youtubeApiKey }).toString();
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube API ${res.status}: ${body}`);
  }
  return res.json();
}

/** channels.list (1 unit). Returns the channel's uploads playlist ID and title. */
export async function getChannel(channelId: string): Promise<{ title: string; uploadsPlaylistId: string }> {
  const data = await get('channels', { part: 'snippet,contentDetails', id: channelId });
  const item = data.items?.[0];
  if (!item) throw new Error(`Channel not found: ${channelId}`);
  return {
    title: item.snippet?.title ?? '',
    // Also derivable by swapping the leading "UC" of the channel ID for "UU".
    uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
  };
}

/** playlistItems.list (1 unit / 50). Returns video IDs from a playlist page. */
export async function listUploadIds(
  playlistId: string,
  pageToken?: string,
): Promise<{ ids: string[]; nextPageToken?: string }> {
  const params: Record<string, string> = {
    part: 'contentDetails',
    playlistId,
    maxResults: '50',
  };
  if (pageToken) params.pageToken = pageToken;
  const data = await get('playlistItems', params);
  const ids = (data.items ?? []).map((i: any) => i.contentDetails.videoId);
  return { ids, nextPageToken: data.nextPageToken };
}

/** videos.list (1 unit / 50). Enriches up to 50 IDs with metadata. */
export async function getVideos(ids: string[]): Promise<VideoMeta[]> {
  if (ids.length === 0) return [];
  const out: VideoMeta[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const data = await get('videos', {
      part: 'snippet,contentDetails,statistics',
      id: batch.join(','),
    });
    for (const item of data.items ?? []) {
      const durationSec = parseIso8601Duration(item.contentDetails.duration);
      out.push({
        id: item.id,
        channelId: item.snippet.channelId,
        title: item.snippet.title,
        description: item.snippet.description ?? '',
        durationSec,
        contentType: durationSec <= SHORT_MAX_SECONDS ? 'short' : 'long',
        thumbnailUrl:
          item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.default?.url ?? '',
        publishedAt: item.snippet.publishedAt,
        viewCount: Number(item.statistics?.viewCount ?? 0),
      });
    }
  }
  return out;
}

/** Parse ISO 8601 duration (e.g. "PT1M5S") to seconds. */
export function parseIso8601Duration(iso: string): number {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso ?? '');
  if (!m) return 0;
  const [, h, min, s] = m;
  return Number(h ?? 0) * 3600 + Number(min ?? 0) * 60 + Number(s ?? 0);
}
