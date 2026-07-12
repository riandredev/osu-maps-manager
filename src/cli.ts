#!/usr/bin/env node
import { Command } from 'commander';
import path from 'node:path';
import { DownloadManager } from './download.js';
import { commitAndPush } from './git.js';
import { importArchives } from './importer.js';
import { mergeBeatmapsets, readManifest, root, writeManifest } from './manifest.js';
import { fetchBeatmapset } from './osu-web.js';
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
  .command('restore')
  .description('Download missing beatmaps from a configured mirror and import them into lazer')
  .option('--provider <url>', 'mirror API base URL', 'https://api.rai.moe')
  .option('--concurrency <number>', 'concurrent downloads', '3')
  .option('--all', 'download all tracked maps, not only missing maps')
  .option('--no-import', 'download without importing into lazer')
  .action(
    async (options: { provider: string; concurrency: string; all?: boolean; import: boolean }) => {
      const manifest = await readManifest();
      let maps = manifest.beatmapsets;
      if (!options.all) {
        const { readInstalledSetIds } = await import('./lazer.js');
        const installed = await readInstalledSetIds();
        maps = maps.filter((map) => !installed.has(map.id));
      }
      const manager = new DownloadManager();
      const files = await manager.downloadAll(
        maps,
        path.join(root, 'downloads'),
        Number(options.concurrency),
        options.provider,
        (progress) => {
          if (progress.state !== 'downloading')
            console.log(
              `[${progress.state}] ${progress.artist} — ${progress.title}${progress.error ? `: ${progress.error}` : ''}`,
            );
        },
      );
      if (options.import) await importArchives(files);
      console.log(
        `Restore finished: ${files.length}/${maps.length} archives ready${options.import ? ' and handed to lazer' : ''}.`,
      );
    },
  );

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
