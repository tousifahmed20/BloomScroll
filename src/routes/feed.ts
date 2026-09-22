import { Router, Request, Response } from 'express';
import { query } from '../db';

export const feedRouter = Router();

// GET /themes — for the theme picker.
feedRouter.get('/themes', async (_req: Request, res: Response) => {
  const rows = await query(`SELECT id, name, slug FROM themes ORDER BY name`);
  res.json(rows);
});

/**
 * GET /themes/:id/videos?type=short|long&cursor=<published_at>&limit=20
 * Cursor pagination on published_at (descending). The app hands each video_id
 * to the embedded IFrame player; we never proxy the video itself.
 */
feedRouter.get('/themes/:id/videos', async (req: Request, res: Response) => {
  const themeId = Number(req.params.id);
  const limit = Math.min(Number(req.query.limit ?? 20), 50);
  const cursor = req.query.cursor ? String(req.query.cursor) : null;
  const type = req.query.type ? String(req.query.type) : null; // 'short' | 'long'

  const params: unknown[] = [themeId];
  let where = `vt.theme_id = $1`;
  if (type) { params.push(type); where += ` AND v.content_type = $${params.length}`; }
  if (cursor) { params.push(cursor); where += ` AND v.published_at < $${params.length}`; }
  params.push(limit);

  const rows = await query(
    `SELECT v.id, v.title, v.duration_sec, v.content_type,
            v.thumbnail_url, v.published_at, c.title AS channel_title
       FROM videos v
       JOIN video_themes vt ON vt.video_id = v.id
       JOIN channels c ON c.id = v.channel_id
      WHERE ${where}
      ORDER BY v.published_at DESC
      LIMIT $${params.length}`,
    params,
  );

  const nextCursor = rows.length === limit ? (rows[rows.length - 1] as any).published_at : null;
  res.json({ items: rows, nextCursor });
});
