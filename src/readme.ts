import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { format } from 'prettier';
import type { Manifest } from './schema.js';
import { root } from './manifest.js';

const start = '<!-- beatmaps:start -->';
const end = '<!-- beatmaps:end -->';

export function renderTable(manifest: Manifest): string {
  if (manifest.beatmapsets.length === 0) {
    return [
      '<div align="center">',
      '  <p>🎧 <strong>Your beatmap library is ready</strong></p>',
      '  <p>Connect your fork in the app, then sync a lazer collection to fill this space.</p>',
      '</div>',
    ].join('\n');
  }
  const rows = [...manifest.beatmapsets]
    .sort((a, b) => a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title))
    .map((map) => {
      const suffix = map.beatmapId ? `#osu/${map.beatmapId}` : '';
      const url = `https://osu.ppy.sh/beatmapsets/${map.id}${suffix}`;
      const cover = `<img src="https://assets.ppy.sh/beatmaps/${map.id}/covers/list.jpg" width="96" alt="">`;
      const track = `**[${escapeCell(map.title)}](${url})**<br><sub>${escapeCell(map.artist)} · beatmapset ${map.id}</sub>`;
      const collections = map.collections.length
        ? map.collections.map((collection) => collectionBadge(collection, 'd94f9d')).join(' ')
        : collectionBadge('Uncategorised', '6b7280');
      return `| ${cover} | ${track} | ${collections} |`;
    });
  return [
    '## Synced beatmaps',
    '',
    collectionSummary(manifest),
    '',
    '| Cover | Beatmap | Collections |',
    '| :---: | --- | --- |',
    ...rows,
  ].join('\n');
}

export async function updateReadme(
  manifest: Manifest,
  file = path.join(root, 'README.md'),
): Promise<void> {
  const current = await import('node:fs/promises').then((fs) => fs.readFile(file, 'utf8'));
  const begin = current.indexOf(start);
  const finish = current.indexOf(end);
  if (begin < 0 || finish < begin)
    throw new Error('README beatmap markers are missing or invalid.');
  const output = `${current.slice(0, begin + start.length)}\n${renderTable(manifest)}\n${current.slice(finish)}`;
  await writeFile(file, await format(output, { parser: 'markdown', printWidth: 100 }), 'utf8');
}

function escapeCell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function collectionBadge(collection: string, colour: string): string {
  const label = encodeURIComponent(collection.replaceAll('-', '--'));
  return `<img alt="${escapeCell(collection)}" src="https://img.shields.io/badge/${label}-${colour}?style=flat-square">`;
}

function collectionSummary(manifest: Manifest): string {
  const count = new Set(manifest.beatmapsets.flatMap((map) => map.collections)).size;
  return `${manifest.beatmapsets.length} beatmapsets across ${count} collection${count === 1 ? '' : 's'}.`;
}
