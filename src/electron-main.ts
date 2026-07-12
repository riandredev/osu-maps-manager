import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';
import updater from 'electron-updater';
import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DownloadManager } from './download.js';
import { cloneOrUpdateRepository, commitAndPush, currentBranch, isGitRepository } from './git.js';
import { importArchives } from './importer.js';
import { readInstalledSetIds, readLazerCollections } from './lazer.js';
import { manifestPath, mergeBeatmapsets, readManifest, root, writeManifest } from './manifest.js';
import { updateReadme } from './readme.js';

let window: BrowserWindow | null = null;
let manager: DownloadManager | null = null;
let libraryRoot = root;
const { autoUpdater } = updater;

app.whenReady().then(async () => {
  libraryRoot = await initialiseLibrary();
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
    scheduleUpdateChecks();
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
});

function scheduleUpdateChecks(): void {
  if (!app.isPackaged) return;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', async (info) => {
    const result = await dialog.showMessageBox(window!, {
      type: 'info',
      title: 'Update available',
      message: `osu! Maps Manager ${info.version} is available.`,
      detail: 'Download the update now? You can keep using the app while it downloads.',
      buttons: ['Download update', 'Not now'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });
    if (result.response === 0) void autoUpdater.downloadUpdate();
  });

  autoUpdater.on('update-downloaded', async (info) => {
    const result = await dialog.showMessageBox(window!, {
      type: 'info',
      title: 'Update ready',
      message: `osu! Maps Manager ${info.version} is ready to install.`,
      detail: 'Restart the app to finish installing the update.',
      buttons: ['Restart and install', 'Later'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });
    if (result.response === 0) autoUpdater.quitAndInstall(false, true);
  });

  autoUpdater.on('error', (error) => console.error('Update check failed:', message(error)));
  const check = () => void autoUpdater.checkForUpdates().catch((error) => console.error(error));
  setTimeout(check, 3_000);
  setInterval(check, 4 * 60 * 60 * 1_000);
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('maps:status', async () => {
  const manifest = await readLibraryManifest();
  let installed: Set<number> | null = null;
  let localCollections: Awaited<ReturnType<typeof readLazerCollections>> = [];
  let scanError: string | null = null;
  try {
    installed = await readInstalledSetIds();
    localCollections = await readLazerCollections();
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
    libraryPath: libraryRoot,
    isGitRepository: isGitRepository(libraryRoot),
    gitBranch: currentBranch(libraryRoot),
    remoteCollections: [...new Set(manifest.beatmapsets.flatMap((map) => map.collections))].sort(),
    localCollections: localCollections.map(({ name, difficultyCount, beatmapsetCount }) => ({
      name,
      difficultyCount,
      beatmapsetCount,
    })),
    maps: manifest.beatmapsets.map((map) => ({
      ...map,
      installed: installed?.has(map.id) ?? null,
    })),
  };
});

ipcMain.handle(
  'maps:sync',
  async (_event, options: { names?: string[]; push?: boolean } | boolean) => {
    const normalised = typeof options === 'boolean' ? { names: ['repo'], push: options } : options;
    const names = normalised.names?.length ? normalised.names : ['repo'];
    const manifest = await readLibraryManifest();
    const collections = await readLazerCollections();
    const selected = collections.filter((collection) =>
      names.some((name) => name.toLocaleLowerCase() === collection.name.toLocaleLowerCase()),
    );
    if (selected.length !== names.length) {
      const found = selected.map((item) => item.name).join(', ') || 'none';
      throw new Error(`Some selected collections were not found. Found: ${found}.`);
    }
    for (const map of manifest.beatmapsets) {
      map.collections = map.collections.filter(
        (collection) =>
          !names.some((name) => name.toLocaleLowerCase() === collection.toLocaleLowerCase()),
      );
    }
    const maps = selected.flatMap((collection) => collection.maps);
    const added = mergeBeatmapsets(manifest, maps);
    await writeManifest(manifest, libraryManifestPath());
    if (await exists(path.join(libraryRoot, 'README.md'))) {
      await updateReadme(manifest, path.join(libraryRoot, 'README.md'));
    }
    if (normalised.push) {
      if (!(await exists(path.join(libraryRoot, '.git')))) {
        throw new Error('The selected library folder is not a Git repository, so it cannot push.');
      }
      commitAndPush(`Sync osu! collections: ${names.join(', ')}`, libraryRoot);
    }
    return { synced: maps.length, added, total: manifest.beatmapsets.length };
  },
);

ipcMain.handle('maps:select-library', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Choose beatmap library folder',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  libraryRoot = result.filePaths[0];
  await ensureLibrary(libraryRoot);
  await saveSettings({ libraryPath: libraryRoot });
  return libraryRoot;
});

ipcMain.handle(
  'maps:connect-repository',
  async (_event, options: { url?: string; branch?: string }) => {
    const url = options.url?.trim();
    const branch = options.branch?.trim() || 'main';
    if (!url) throw new Error('Enter a GitHub repository URL.');
    const parent = path.join(app.getPath('userData'), 'repositories');
    await mkdir(parent, { recursive: true });
    libraryRoot = cloneOrUpdateRepository(url, branch, parent);
    await ensureLibrary(libraryRoot);
    await saveSettings({ libraryPath: libraryRoot });
    return libraryRoot;
  },
);

ipcMain.handle('maps:restore', async (_event, raw: unknown) => {
  if (manager) throw new Error('A restore is already running.');
  const options = raw as {
    concurrency?: number;
    provider?: string;
    collection?: string;
    importAfter?: boolean;
    onlyMissing?: boolean;
  };
  const manifest = await readLibraryManifest();
  let maps = manifest.beatmapsets;
  if (options.collection) {
    maps = maps.filter((map) => map.collections.includes(options.collection!));
  }
  if (maps.length === 0) {
    throw new Error(
      'No tracked beatmaps matched this restore. Connect a repository in Settings or sync a local collection first.',
    );
  }
  if (options.onlyMissing !== false) {
    const installed = await readInstalledSetIds();
    maps = maps.filter((map) => !installed.has(map.id));
  }
  if (maps.length === 0) {
    return { requested: 0, downloaded: 0, imported: 0, nothingToDo: 'already-installed' };
  }
  manager = new DownloadManager();
  try {
    const files = await manager.downloadAll(
      maps,
      path.join(libraryRoot, 'downloads'),
      Number(options.concurrency) || 3,
      options.provider || 'auto',
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

function libraryManifestPath(): string {
  return path.join(libraryRoot, 'beatmaps.json');
}

async function readLibraryManifest() {
  return readManifest(libraryManifestPath());
}

async function initialiseLibrary(): Promise<string> {
  if (!app.isPackaged) return root;
  const settings = await readSettings();
  const directory = settings.libraryPath || path.join(app.getPath('userData'), 'library');
  await ensureLibrary(directory);
  return directory;
}

async function ensureLibrary(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true });
  const destination = path.join(directory, 'beatmaps.json');
  if (!(await exists(destination))) await copyFile(manifestPath, destination);
}

async function readSettings(): Promise<{ libraryPath?: string }> {
  try {
    return JSON.parse(await readFile(settingsPath(), 'utf8')) as { libraryPath?: string };
  } catch {
    return {};
  }
}

async function saveSettings(settings: { libraryPath: string }): Promise<void> {
  await mkdir(app.getPath('userData'), { recursive: true });
  await writeFile(settingsPath(), `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
}

function settingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}
