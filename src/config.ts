import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 8080),
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? '',
  databaseUrl: required('DATABASE_URL'),
  youtubeApiKey: required('YOUTUBE_API_KEY'),
  websubSecret: process.env.WEBSUB_SECRET ?? '',
  websubHub: 'https://pubsubhubbub.appspot.com/subscribe',
  oauth: {
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? '',
    redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI ?? '',
  },
};

// Treat videos at or under this length as Shorts. Heuristic only — the Data API
// has no official "is a Short" flag. Shorts can be up to ~180s; tune to taste.
export const SHORT_MAX_SECONDS = 180;
