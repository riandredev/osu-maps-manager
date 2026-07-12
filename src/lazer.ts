import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import type { Beatmapset } from './schema.js';

type Dynamic = Record<string, any>;

export function defaultRealmPath(): string {
  if (process.env.OSU_REALM_PATH) return process.env.OSU_REALM_PATH;
  if (process.platform === 'win32')
    return path.join(process.env.APPDATA ?? '', 'osu', 'client.realm');
  if (process.platform === 'darwin')
    return path.join(os.homedir(), 'Library', 'Application Support', 'osu', 'client.realm');
  return path.join(os.homedir(), '.local', 'share', 'osu', 'client.realm');
}

export async function readLazerCollection(
  collectionName: string,
  database = defaultRealmPath(),
): Promise<Beatmapset[]> {
  if (isOsuRunning()) {
    throw new Error(
      'osu!lazer is running. Close osu! so its collection database can be read safely, then retry.',
    );
  }
  const { default: Realm } = await import('realm');
  let realm;
  try {
    realm = await Realm.open({ path: database, readOnly: true });
  } catch (error) {
    throw new Error(`Could not open osu!lazer database at ${database}. Close osu! and retry.`, {
      cause: error,
    });
  }
  try {
    const collection = [...realm.objects<Dynamic>('BeatmapCollection')].find(
      (item) => String(item.Name).toLocaleLowerCase() === collectionName.toLocaleLowerCase(),
    );
    if (!collection) throw new Error(`Collection "${collectionName}" was not found in osu!lazer.`);
    const wanted = new Set<string>([...collection.BeatmapMD5Hashes].map(String));
    const sets = new Map<number, Beatmapset>();
    for (const beatmap of realm.objects<Dynamic>('Beatmap')) {
      if (!wanted.has(String(beatmap.MD5Hash))) continue;
      const setId = Number(beatmap.BeatmapSet?.OnlineID ?? -1);
      if (setId <= 0) continue;
      const metadata = beatmap.Metadata;
      sets.set(setId, {
        id: setId,
        beatmapId: Number(beatmap.OnlineID) > 0 ? Number(beatmap.OnlineID) : null,
        artist: String(metadata?.Artist ?? 'Unknown artist'),
        title: String(metadata?.Title ?? 'Unknown title'),
        collections: [collectionName],
        notes: '',
      });
    }
    return [...sets.values()];
  } finally {
    realm.close();
  }
}

export async function readInstalledSetIds(database = defaultRealmPath()): Promise<Set<number>> {
  if (isOsuRunning()) throw new Error('Close osu!lazer before scanning installed beatmaps.');
  const { default: Realm } = await import('realm');
  const realm = await Realm.open({ path: database, readOnly: true });
  try {
    const ids = new Set<number>();
    for (const set of realm.objects<Dynamic>('BeatmapSet')) {
      const id = Number(set.OnlineID);
      if (id > 0 && !set.DeletePending) ids.add(id);
    }
    return ids;
  } finally {
    realm.close();
  }
}

function isOsuRunning(): boolean {
  if (process.platform !== 'win32') return false;
  try {
    const output = execFileSync('tasklist', ['/fi', 'imagename eq osu!.exe', '/fo', 'csv', '/nh'], {
      encoding: 'utf8',
      windowsHide: true,
    });
    return output.toLocaleLowerCase().includes('osu!.exe');
  } catch {
    return false;
  }
}
