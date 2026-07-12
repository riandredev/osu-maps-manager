import type { Beatmapset } from './schema.js';

const beatmapUrl = /osu\.ppy\.sh\/beatmapsets\/(\d+)(?:#[a-z]+\/(\d+))?/i;

export function parseBeatmapUrl(value: string): { setId: number; beatmapId: number | null } {
  const match = beatmapUrl.exec(value);
  if (!match?.[1]) throw new Error(`Not an osu! beatmapset URL: ${value}`);
  return { setId: Number(match[1]), beatmapId: match[2] ? Number(match[2]) : null };
}

export async function fetchBeatmapset(value: string, collection: string): Promise<Beatmapset> {
  const { setId, beatmapId } = parseBeatmapUrl(value);
  const response = await fetch(`https://osu.ppy.sh/beatmapsets/${setId}`, {
    signal: AbortSignal.timeout(15_000),
    headers: { 'user-agent': 'osu-maps/1.0 (+https://github.com/riandredev/osu-beatmaps)' },
  });
  if (!response.ok)
    throw new Error(`osu! returned HTTP ${response.status} for beatmapset ${setId}`);
  const html = await response.text();
  const titleTag = /<title>(.*?)<\/title>/is.exec(html)?.[1];
  if (!titleTag) throw new Error(`Could not read metadata for beatmapset ${setId}`);
  const label = decodeHtml(titleTag)
    .replace(/\s*· beatmap info.*$/u, '')
    .trim();
  const separator = label.indexOf(' - ');
  if (separator < 1) throw new Error(`Unexpected osu! title for beatmapset ${setId}: ${label}`);
  return {
    id: setId,
    beatmapId,
    artist: label.slice(0, separator),
    title: label.slice(separator + 3),
    collections: [collection],
    notes: '',
  };
}

function decodeHtml(input: string): string {
  return input
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#039;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replace(/[\u202a-\u202e\u2066-\u2069]/g, '');
}
