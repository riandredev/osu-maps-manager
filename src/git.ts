import { spawnSync } from 'node:child_process';
import { root } from './manifest.js';

export function commitAndPush(message: string, cwd = root): void {
  runGit(['add', 'beatmaps.json', 'README.md'], cwd);
  const diff = spawnSync('git', ['diff', '--cached', '--quiet'], { cwd });
  if (diff.status === 0) return;
  runGit(['commit', '-m', message], cwd);
  runGit(['push'], cwd);
}

function runGit(args: string[], cwd: string): void {
  const result = spawnSync('git', args, { cwd, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`git ${args[0]} failed with exit code ${result.status}`);
}
