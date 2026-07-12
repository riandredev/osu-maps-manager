import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';

export function defaultOsuExecutable(): string {
  if (process.platform === 'win32')
    return path.join(process.env.LOCALAPPDATA ?? '', 'osulazer', 'current', 'osu!.exe');
  if (process.platform === 'darwin') return '/Applications/osu!.app/Contents/MacOS/osu!';
  return 'osu!';
}

export async function importArchives(
  files: string[],
  executable = defaultOsuExecutable(),
  onImported?: (file: string, index: number, total: number) => void,
): Promise<void> {
  if (files.length === 0) return;
  if (path.isAbsolute(executable)) await access(executable);
  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    if (!file) continue;
    await launch(executable, file);
    onImported?.(file, index + 1, files.length);
    await new Promise((resolve) => setTimeout(resolve, index === 0 ? 1500 : 250));
  }
}

function launch(executable: string, file: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, [file], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    });
    child.once('error', reject);
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
  });
}
