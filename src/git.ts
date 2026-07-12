import { spawnSync } from 'node:child_process';
import { root } from './manifest.js';

export function commitAndPush(message: string): void {
  runGit(['add', 'beatmaps.json', 'README.md']);
  const diff = spawnSync('git', ['diff', '--cached', '--quiet'], { cwd: root });
  if (diff.status === 0) return;
  runGit(['commit', '-m', message]);
  runGit(['push']);
}

function runGit(args: string[]): void {
  const result = spawnSync('git', args, { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`git ${args[0]} failed with exit code ${result.status}`);
}
