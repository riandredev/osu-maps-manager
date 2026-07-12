import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';
import path from 'node:path';
import { DownloadManager } from './download.js';
import { commitAndPush } from './git.js';
import { importArchives } from './importer.js';
import { readInstalledSetIds, readLazerCollection } from './lazer.js';
import { mergeBeatmapsets, readManifest, root, writeManifest } from './manifest.js';
import { updateReadme } from './readme.js';

let window: BrowserWindow | null = null;
let manager: DownloadManager | null = null;

app.whenReady().then(() => {
  app.setAppUserModelId('dev.riandre.osuMaps');
  Menu.setApplicationMenu(null);
  window = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 850,
    minHeight: 600,
    title: 'osu! Maps Manager',
    backgroundColor: '#11131a',
    icon: path.join(root, 'assets', 'app-icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(import.meta.dirname, 'electron-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  void window.loadFile(path.join(root, 'ui-dist', 'index.html'));
  window.webContents.once('did-finish-load', async () => {
    const bridgeReady = await window?.webContents.executeJavaScript(
      "typeof window.osuMaps === 'object' && typeof window.osuMaps.sync === 'function'",
    );
    console.log(`Renderer bridge: ${bridgeReady ? 'ready' : 'unavailable'}`);
    if (!bridgeReady) {
      dialog.showErrorBox(
        'Desktop bridge unavailable',
        'The preload bridge did not load. Rebuild the application with pnpm build and restart it.',
      );
    }
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('maps:status', async () => {
  const manifest = await readManifest();
  let installed: Set<number> | null = null;
  let scanError: string | null = null;
  try {
    installed = await readInstalledSetIds();
  } catch (error) {
    scanError = message(error);
  }
  return {
    total: manifest.beatmapsets.length,
    installed: installed
      ? manifest.beatmapsets.filter((map) => installed.has(map.id)).length
      : null,
    missing: installed ? manifest.beatmapsets.filter((map) => !installed.has(map.id)).length : null,
    scanError,
    maps: manifest.beatmapsets.map((map) => ({
      ...map,
      installed: installed?.has(map.id) ?? null,
    })),
  };
});

ipcMain.handle('maps:sync', async (_event, push: boolean) => {
  const manifest = await readManifest();
  const maps = await readLazerCollection('repo');
  const added = mergeBeatmapsets(manifest, maps);
  await writeManifest(manifest);
  await updateReadme(manifest);
  if (push) commitAndPush('Sync osu! collection repo');
  return { synced: maps.length, added, total: manifest.beatmapsets.length };
});

ipcMain.handle('maps:restore', async (_event, raw: unknown) => {
  if (manager) throw new Error('A restore is already running.');
  const options = raw as {
    concurrency?: number;
    provider?: string;
    importAfter?: boolean;
    onlyMissing?: boolean;
  };
  const manifest = await readManifest();
  let maps = manifest.beatmapsets;
  if (options.onlyMissing !== false) {
    const installed = await readInstalledSetIds();
    maps = maps.filter((map) => !installed.has(map.id));
  }
  manager = new DownloadManager();
  try {
    const files = await manager.downloadAll(
      maps,
      path.join(root, 'downloads'),
      Number(options.concurrency) || 3,
      options.provider || 'https://api.rai.moe',
      (progress) => window?.webContents.send('maps:progress', { type: 'download', ...progress }),
    );
    if (options.importAfter !== false && files.length > 0) {
      await importArchives(files, undefined, (file, index, total) =>
        window?.webContents.send('maps:progress', { type: 'import', file, index, total }),
      );
    }
    return {
      requested: maps.length,
      downloaded: files.length,
      imported: options.importAfter === false ? 0 : files.length,
    };
  } finally {
    manager = null;
  }
});

ipcMain.handle('maps:cancel', () => {
  manager?.cancel();
  return true;
});

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
