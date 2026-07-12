import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { format } from 'prettier';
import { manifestSchema, type Beatmapset, type Manifest } from './schema.js';

export const root = path.resolve(import.meta.dirname, '..');
export const manifestPath = path.join(root, 'beatmaps.json');

export async function readManifest(file = manifestPath): Promise<Manifest> {
  const parsed: unknown = JSON.parse(await readFile(file, 'utf8'));
  const manifest = manifestSchema.parse(parsed);
  assertUnique(manifest.beatmapsets);
  return manifest;
}

export async function writeManifest(manifest: Manifest, file = manifestPath): Promise<void> {
  const validated = manifestSchema.parse(manifest);
  assertUnique(validated.beatmapsets);
  validated.beatmapsets.sort(
    (a, b) => a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title),
  );
  await writeFile(
    file,
    await format(JSON.stringify(validated), { parser: 'json', printWidth: 100 }),
    'utf8',
  );
}

export function assertUnique(beatmapsets: Beatmapset[]): void {
  const seen = new Set<number>();
  for (const beatmapset of beatmapsets) {
    if (seen.has(beatmapset.id)) throw new Error(`Duplicate beatmapset ID: ${beatmapset.id}`);
    seen.add(beatmapset.id);
  }
}

export function mergeBeatmapsets(manifest: Manifest, additions: Beatmapset[]): number {
  const existing = new Map(manifest.beatmapsets.map((item) => [item.id, item]));
  let added = 0;
  for (const addition of additions) {
    const current = existing.get(addition.id);
    if (current) {
      current.collections = [...new Set([...current.collections, ...addition.collections])].sort();
      continue;
    }
    manifest.beatmapsets.push(addition);
    existing.set(addition.id, addition);
    added++;
  }
  return added;
}
