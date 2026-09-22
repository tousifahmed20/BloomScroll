-- BloomScroll schema. Metadata + references only — no video files.
-- Global curated catalogue (shared by all users) + isolated per-user tables.

CREATE TABLE IF NOT EXISTS themes (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS channels (
  id                   TEXT PRIMARY KEY,           -- YouTube channel ID (UC...)
  title                TEXT,
  uploads_playlist_id  TEXT NOT NULL,              -- UU... (derived from channel ID)
  websub_expires_at    TIMESTAMPTZ,
  added_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS videos (
  id            TEXT PRIMARY KEY,                  -- 11-char video ID
  channel_id    TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  title         TEXT,
  description   TEXT,
  duration_sec  INTEGER,
  content_type  TEXT NOT NULL DEFAULT 'long',      -- 'short' | 'long' | 'live'
  thumbnail_url TEXT,                              -- hotlinked from YouTube CDN, never rehosted
  published_at  TIMESTAMPTZ,
  view_count    BIGINT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_videos_channel ON videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_videos_published ON videos(published_at DESC);

-- Channel -> themes (a channel can belong to several themes; videos inherit).
CREATE TABLE IF NOT EXISTS channel_themes (
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  theme_id   INTEGER NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  PRIMARY KEY (channel_id, theme_id)
);

-- Denormalised video -> themes for fast feed reads.
CREATE TABLE IF NOT EXISTS video_themes (
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  theme_id INTEGER NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  PRIMARY KEY (video_id, theme_id)
);
CREATE INDEX IF NOT EXISTS idx_video_themes_theme ON video_themes(theme_id);

-- ── Per-account (isolated) ────────────────────────────────────────────────
-- User-added channels NEVER merge into the global tables above.

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,                  -- your app's user ID
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_channels (
  user_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id           TEXT NOT NULL,
  title                TEXT,
  uploads_playlist_id  TEXT NOT NULL,
  theme_id             INTEGER REFERENCES themes(id),  -- theme the USER assigned it to
  added_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, channel_id)
);

CREATE TABLE IF NOT EXISTS user_videos (
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id      TEXT NOT NULL,
  channel_id    TEXT NOT NULL,
  title         TEXT,
  duration_sec  INTEGER,
  content_type  TEXT NOT NULL DEFAULT 'long',
  thumbnail_url TEXT,
  published_at  TIMESTAMPTZ,
  PRIMARY KEY (user_id, video_id)
);
CREATE INDEX IF NOT EXISTS idx_user_videos_user ON user_videos(user_id, published_at DESC);
