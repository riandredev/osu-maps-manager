import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { format } from 'prettier';
import type { Manifest } from './schema.js';
import { root } from './manifest.js';

const start = '<!-- beatmaps:start -->';
const end = '<!-- beatmaps:end -->';

export function renderTable(manifest: Manifest): string {
  const rows = [...manifest.beatmapsets]
    .sort((a, b) => a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title))
    .map((map) => {
      const suffix = map.beatmapId ? `#osu/${map.beatmapId}` : '';
      return `| ${escapeCell(map.artist)} | ${escapeCell(map.title)} | ${map.collections.join(', ')} | [${map.id}](https://osu.ppy.sh/beatmapsets/${map.id}${suffix}) |`;
    });
  return [
    '| Artist | Title | Collections | Beatmapset |',
    '| --- | --- | --- | ---: |',
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
