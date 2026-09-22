import { createApp } from './app';
import { config } from './config';

const app = createApp();
app.listen(config.port, () => {
  console.log(`BloomScroll backend listening on :${config.port}`);
});
