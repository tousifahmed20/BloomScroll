/**
 * CLI: onboard a curated channel into the global catalogue.
 * Usage: tsx src/scripts/onboard.ts <channelId> <themeId[,themeId...]> [depth]
 */
import { onboardChannel } from '../ingest';

async function main() {
  const [channelId, themeCsv, depthArg] = process.argv.slice(2);
  if (!channelId || !themeCsv) {
    console.error('Usage: onboard <channelId> <themeId[,themeId]> [depth]');
    process.exit(1);
  }
  const themeIds = themeCsv.split(',').map(Number);
  const depth = depthArg ? Number(depthArg) : 1;
  const n = await onboardChannel(channelId, themeIds, depth);
  console.log(`Onboarded ${channelId}: ${n} videos across themes ${themeIds.join(', ')}`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
