import express from 'express';
import { feedRouter } from './routes/feed';
import { userRouter } from './routes/userChannels';
import { websubRouter } from './websub';

export function createApp() {
  const app = express();

  // WebSub posts Atom XML — capture the raw body for that route only.
  app.use('/websub', express.raw({ type: () => true }), websubRouter);

  app.use(express.json());
  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/', feedRouter);
  app.use('/', userRouter);

  return app;
}
