import { createServer, type Server } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DownloadManager } from './download.js';

const archive = Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4]);
let server: Server | undefined;
let directory: string | undefined;

afterEach(async () => {
  if (server)
    await new Promise<void>((resolve, reject) =>
      server!.close((error) => (error ? reject(error) : resolve())),
    );
  if (directory) await rm(directory, { recursive: true, force: true });
  server = undefined;
  directory = undefined;
  vi.unstubAllGlobals();
});

describe('download manager', () => {
  it('resolves, streams, validates, and skips an existing OSZ archive', async () => {
    server = createServer((request, response) => {
      if (request.url === '/beatmaps/42/download') {
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ url: '/file', filename: 'test.osz', size: archive.length }));
        return;
      }
      response.setHeader('content-length', archive.length);
      response.end(archive);
    });
    await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server did not bind.');
    const provider = `http://127.0.0.1:${address.port}`;
    directory = await mkdtemp(path.join(tmpdir(), 'osu-maps-'));
    const states: string[] = [];
    const map = {
      id: 42,
      beatmapId: null,
      artist: 'Artist',
      title: 'Title',
      collections: ['repo'],
      notes: '',
    };

    const first = await new DownloadManager().downloadAll([map], directory, 2, provider, (event) =>
      states.push(event.state),
    );
    expect(first).toHaveLength(1);
    expect(await readFile(first[0]!)).toEqual(archive);
    expect(states).toContain('complete');

    states.length = 0;
    await new DownloadManager().downloadAll([map], directory, 2, provider, (event) =>
      states.push(event.state),
    );
    expect(states).toContain('skipped');
  });

  it('falls back when providers return fetching metadata or invalid files', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: URL | RequestInfo) => {
        const url = String(input);
        calls.push(url);
        if (url.includes('rai.moe')) {
          return Response.json({
            status: 'fetching',
            message: 'Beatmap is being fetched from upstream.',
          });
        }
        if (url.includes('nerinyan.moe')) return new Response('not an archive');
        return new Response(archive, {
          headers: { 'content-length': String(archive.length) },
        });
      }),
    );
    directory = await mkdtemp(path.join(tmpdir(), 'osu-maps-fallback-'));
    const map = {
      id: 43,
      beatmapId: null,
      artist: 'Artist',
      title: 'Title',
      collections: ['repo'],
      notes: '',
    };

    const files = await new DownloadManager().downloadAll(
      [map],
      directory,
      1,
      'auto',
      () => undefined,
    );

    expect(files).toHaveLength(1);
    expect(calls.some((url) => url.includes('rai.moe'))).toBe(true);
    expect(calls.some((url) => url.includes('nerinyan.moe'))).toBe(true);
    expect(calls.some((url) => url.includes('catboy.best'))).toBe(true);
  });
});
