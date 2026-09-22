# BloomScroll

**The anti-doomscroll.** A themed, curated feed of educational YouTube Shorts and
long-form videos — you pick a skill, you get a feed locked to that skill, nothing else.

This repo is the **backend** (Phase 1): channel ingestion, free real-time freshness
via WebSub, and the app-facing API. Node.js + Express + TypeScript. MIT licensed.

## What it is (and isn't)

BloomScroll **references** YouTube content; it never hosts or copies it.

- ✅ Curated catalogue of video **metadata** pulled from hand-picked channels.
- ✅ Playback via YouTube's **official embedded player** (on the client).
- ✅ One Google Cloud project, quota-cheap reads, free WebSub push.
- ❌ No downloading video/audio. No transcription of others' videos.
- ❌ No cloning YouTube's UI. No ads sold against the player.
- ❌ No splitting quota across multiple projects.

These aren't style choices — they're what keeps the YouTube API access alive.

## Architecture

```
Curated channels ──(scheduled ingest)──> Postgres (metadata only) ──> App-facing API ──> Android app
                    playlistItems.list (1u)                              GET /themes            plays video_id
                    videos.list (1u)                                     GET /themes/:id/videos in the IFrame player
WebSub push (0 units) ─────────────────> new uploads land automatically
```

User count and API quota are **decoupled**: the API is touched only during ingest.
A million users reading the cached feed costs zero extra units; playback runs
phone → YouTube directly.

## Quick start

```bash
cp .env.example .env          # fill in DATABASE_URL and YOUTUBE_API_KEY
npm install
npm run db:init               # create tables
psql "$DATABASE_URL" -f db/seed_themes.sql   # load the 42 themes
npm run dev                   # start the server
```

Onboard a curated channel (find its UC… channel ID first):

```bash
# tsx src/scripts/onboard.ts <channelId> <themeId[,themeId]> [depth]
npm run ingest -- UCsBjURrPoezykLs9EqgamOA 2      # e.g. a coding channel -> theme 2
```

### WebSub (free freshness)

Set `PUBLIC_BASE_URL` to a publicly reachable HTTPS host, then subscribe channels
(hub calls back `/websub/callback`). Leases expire ~5 days — renew on a schedule.

## API

| Endpoint | Purpose |
| --- | --- |
| `GET /themes` | List themes for the picker |
| `GET /themes/:id/videos?type=short\|long&cursor=&limit=` | Cursor-paged theme feed |
| `GET /health` | Health check |
| `GET /auth/google?userId=` | Start OAuth to link a user's account (optional) |
| `POST /me/channels` | Add a channel to a user's **isolated** list `{userId, channelId, themeId}` |
| `GET /me/videos?userId=` | A user's personal (isolated) feed |

Per-account channels live in `user_channels` / `user_videos` and **never** merge
into the global catalogue.

## Roadmap

- **Phase 1 (this repo):** curated cached feed, dual short/long UI (Android app is a
  separate module), WebSub freshness.
- **Phase 2:** quizzes — per-video where descriptions are rich, theme-level banks
  otherwise; generated once, cached, reviewed per theme.
- **Phase 3:** spaced-repetition review over concepts.

## Contributing

PRs welcome. Keep the compliance guardrails above intact — they're non-negotiable.

## License

MIT — see [LICENSE](./LICENSE).

## Android app (`/android`)

Kotlin + Jetpack Compose. Talks only to this backend; plays video via the
official IFrame player (wrapped by `android-youtube-player`).

- **Theme picker** → `GET /themes`.
- **Feed** with a Shorts / Long-form toggle → `GET /themes/:id/videos?type=…`.
  Shorts render as a full-screen `VerticalPager`; long-form as a thumbnail list
  that plays inline on tap.
- Set the backend URL in `android/app/build.gradle.kts` (`BASE_URL`).

Open the `android/` folder in Android Studio (it will generate the Gradle
wrapper), then Run. Requires Android Studio Koala+ / AGP 8.5, minSdk 24.

> Note: the Android module is a reviewed scaffold, **not build-verified** here
> (no Android SDK in the build environment). The backend *is* type-checked.
> Known scaffold TODOs: pause off-screen Shorts players, and debounce the
> load-more trigger.
