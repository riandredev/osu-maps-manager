#!/usr/bin/env node
import { Command } from 'commander';
import { commitAndPush } from './git.js';
import { mergeBeatmapsets, readManifest, writeManifest } from './manifest.js';
import { fetchBeatmapset } from './osu-web.js';
import { openUrl } from './platform.js';
import { updateReadme } from './readme.js';

const program = new Command()
  .name('osu-maps')
  .description('Track and restore osu! beatmapsets')
  .version('1.0.0');

program
  .command('verify')
  .description('Validate the manifest and reject duplicate IDs')
  .action(async () => {
    const manifest = await readManifest();
    console.log(`Manifest is valid: ${manifest.beatmapsets.length} unique beatmapsets.`);
  });

program
  .command('readme')
  .description('Regenerate the README beatmap table')
  .action(async () => {
    const manifest = await readManifest();
    await updateReadme(manifest);
    console.log('README table updated.');
  });

program
  .command('add')
  .description('Add one or more osu! beatmapset URLs')
  .argument('<urls...>')
  .option('-c, --collection <name>', 'collection name', 'favourite')
  .option('--push', 'commit and push changes')
  .action(async (urls: string[], options: { collection: string; push?: boolean }) => {
    const manifest = await readManifest();
    const additions = await Promise.all(
      urls.map((url) => fetchBeatmapset(url, options.collection)),
    );
    const count = mergeBeatmapsets(manifest, additions);
    await writeManifest(manifest);
    await updateReadme(manifest);
    if (options.push) commitAndPush(`Add ${count} osu! beatmapset${count === 1 ? '' : 's'}`);
    console.log(
      `Added ${count}; ${manifest.beatmapsets.length} total. README updated${options.push ? ' and pushed' : ''}.`,
    );
  });

program
  .command('sync-collection')
  .description('Sync a local osu!lazer collection into the manifest')
  .option('-n, --name <name>', 'osu! collection name', 'repo')
  .option('-d, --database <path>', 'path to client.realm')
  .option('--push', 'commit and push changes')
  .action(async (options: { name: string; database?: string; push?: boolean }) => {
    const { readLazerCollection } = await import('./lazer.js');
    const manifest = await readManifest();
    const maps = await readLazerCollection(options.name, options.database);
    const count = mergeBeatmapsets(manifest, maps);
    await writeManifest(manifest);
    await updateReadme(manifest);
    if (options.push) commitAndPush(`Sync osu! collection ${options.name}`);
    console.log(
      `Synced ${maps.length} collection entries; added ${count}; ${manifest.beatmapsets.length} total${options.push ? ' and pushed' : ''}.`,
    );
  });

program
  .command('download')
  .description('Open official authenticated osu! download pages for restoration')
  .option('-c, --collection <name>', 'only open one collection')
  .action(async (options: { collection?: string }) => {
    const manifest = await readManifest();
    const maps = options.collection
      ? manifest.beatmapsets.filter((map) => map.collections.includes(options.collection!))
      : manifest.beatmapsets;
    for (const map of maps) {
      await openUrl(`https://osu.ppy.sh/beatmapsets/${map.id}/download`);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    console.log(`Opened ${maps.length} official download pages.`);
  });

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
