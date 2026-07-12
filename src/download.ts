import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, open, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { Beatmapset } from './schema.js';

export type DownloadState = 'queued' | 'downloading' | 'complete' | 'skipped' | 'failed';
export interface DownloadProgress {
  id: number;
  artist: string;
  title: string;
  state: DownloadState;
  received: number;
  total: number | null;
  attempt: number;
  file?: string;
  error?: string;
}

interface SignedDownload {
  url: string;
  filename: string;
  size: number;
}

export class DownloadManager {
  private controller = new AbortController();

  cancel(): void {
    this.controller.abort();
  }

  async downloadAll(
    maps: Beatmapset[],
    outputDirectory: string,
    concurrency: number,
    providerBase: string,
    onProgress: (progress: DownloadProgress) => void,
  ): Promise<string[]> {
    await mkdir(outputDirectory, { recursive: true });
    const files: string[] = [];
    let cursor = 0;
    const workers = Array.from({ length: Math.max(1, Math.min(8, concurrency)) }, async () => {
      while (!this.controller.signal.aborted) {
        const index = cursor++;
        const map = maps[index];
        if (!map) return;
        const file = await this.downloadOne(map, outputDirectory, providerBase, onProgress);
        if (file) files.push(file);
      }
    });
    await Promise.all(workers);
    return files;
  }

  private async downloadOne(
    map: Beatmapset,
    outputDirectory: string,
    providerBase: string,
    onProgress: (progress: DownloadProgress) => void,
  ): Promise<string | null> {
    const base = { id: map.id, artist: map.artist, title: map.title };
    onProgress({ ...base, state: 'queued', received: 0, total: null, attempt: 0 });
    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const signed = await this.getSignedDownload(map.id, providerBase);
        const filename = sanitizeFilename(
          signed.filename || `${map.id} ${map.artist} - ${map.title}.osz`,
        );
        const destination = path.join(
          outputDirectory,
          filename.endsWith('.osz') ? filename : `${filename}.osz`,
        );
        if (await isValidArchive(destination, signed.size)) {
          onProgress({
            ...base,
            state: 'skipped',
            received: signed.size,
            total: signed.size,
            attempt,
            file: destination,
          });
          return destination;
        }
        const partial = `${destination}.part`;
        await rm(partial, { force: true });
        const response = await fetch(new URL(signed.url, providerBase), {
          signal: this.controller.signal,
        });
        if (!response.ok || !response.body)
          throw new Error(`Download returned HTTP ${response.status}`);
        const total = Number(response.headers.get('content-length')) || signed.size || null;
        let received = 0;
        const hash = createHash('sha256');
        const progress = new Transform({
          transform(chunk: Buffer, _encoding, callback) {
            received += chunk.length;
            hash.update(chunk);
            onProgress({ ...base, state: 'downloading', received, total, attempt });
            callback(null, chunk);
          },
        });
        await pipeline(
          Readable.fromWeb(response.body as never),
          progress,
          createWriteStream(partial),
        );
        if (!(await isValidArchive(partial, signed.size)))
          throw new Error('Downloaded file is not a valid OSZ/ZIP archive');
        await rename(partial, destination);
        onProgress({ ...base, state: 'complete', received, total, attempt, file: destination });
        return destination;
      } catch (error) {
        lastError = error;
        if (this.controller.signal.aborted) return null;
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
      }
    }
    onProgress({
      ...base,
      state: 'failed',
      received: 0,
      total: null,
      attempt: 3,
      error: lastError instanceof Error ? lastError.message : String(lastError),
    });
    return null;
  }

  private async getSignedDownload(setId: number, providerBase: string): Promise<SignedDownload> {
    const response = await fetch(new URL(`/beatmaps/${setId}/download`, providerBase), {
      signal: this.controller.signal,
    });
    if (!response.ok) throw new Error(`Mirror metadata returned HTTP ${response.status}`);
    const value = (await response.json()) as Partial<SignedDownload>;
    if (!value.url || !value.filename)
      throw new Error('Mirror returned an invalid download response');
    return { url: value.url, filename: value.filename, size: Number(value.size) || 0 };
  }
}

async function isValidArchive(file: string, expectedSize = 0): Promise<boolean> {
  try {
    const info = await stat(file);
    if (info.size < 4 || (expectedSize > 0 && info.size !== expectedSize)) return false;
    const handle = await open(file, 'r');
    try {
      const signature = Buffer.alloc(4);
      await handle.read(signature, 0, 4, 0);
      return signature[0] === 0x50 && signature[1] === 0x4b;
    } finally {
      await handle.close();
    }
  } catch {
    return false;
  }
}

function sanitizeFilename(value: string): string {
  // Windows reserves ASCII control characters and the following punctuation in filenames.
  /* eslint-disable no-control-regex */
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/[. ]+$/g, '')
    .slice(0, 180);
  /* eslint-enable no-control-regex */
}
