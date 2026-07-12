import { describe, expect, it } from 'vitest';
import { mergeBeatmapsets } from './manifest.js';
import { parseBeatmapUrl } from './osu-web.js';
import { renderTable } from './readme.js';
import type { Manifest } from './schema.js';

const empty = (): Manifest => ({ version: 1, beatmapsets: [] });

describe('beatmap URLs', () => {
  it('parses set and difficulty IDs', () => {
    expect(parseBeatmapUrl('https://osu.ppy.sh/beatmapsets/1151309#osu/2405790')).toEqual({
      setId: 1151309,
      beatmapId: 2405790,
    });
  });
});

describe('manifest merging', () => {
  it('deduplicates sets and merges collection names', () => {
    const manifest = empty();
    const map = { id: 1, beatmapId: 2, artist: 'A', title: 'T', collections: ['repo'], notes: '' };
    expect(mergeBeatmapsets(manifest, [map])).toBe(1);
    expect(mergeBeatmapsets(manifest, [{ ...map, collections: ['warmup'] }])).toBe(0);
    expect(manifest.beatmapsets[0]?.collections).toEqual(['repo', 'warmup']);
  });

  it('renders official links', () => {
    const manifest = empty();
    mergeBeatmapsets(manifest, [
      { id: 10, beatmapId: null, artist: 'A', title: 'T', collections: ['repo'], notes: '' },
    ]);
    expect(renderTable(manifest)).toContain('https://osu.ppy.sh/beatmapsets/10');
  });
});
