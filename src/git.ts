import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { root } from './manifest.js';

export function commitAndPush(message: string, cwd = root): void {
  runGit(['add', 'beatmaps.json', 'README.md'], cwd);
  const diff = spawnSync('git', ['diff', '--cached', '--quiet'], { cwd });
  if (diff.status === 0) return;
  runGit(['commit', '-m', message], cwd);
  runGit(['push'], cwd);
}

export function isGitRepository(directory: string): boolean {
  return existsSync(path.join(directory, '.git'));
}

export function currentBranch(directory: string): string | null {
  if (!isGitRepository(directory)) return null;
  const result = spawnSync('git', ['branch', '--show-current'], {
    cwd: directory,
    encoding: 'utf8',
    windowsHide: true,
  });
  return result.status === 0 ? result.stdout.trim() || null : null;
}

export function cloneOrUpdateRepository(
  url: string,
  branch: string,
  parentDirectory: string,
): string {
  if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(?:\.git)?$/i.test(url)) {
    throw new Error('Enter a valid HTTPS GitHub repository URL.');
  }
  if (!/^[\w./-]+$/.test(branch)) throw new Error('The branch name contains invalid characters.');
  const repositoryParent = path.resolve(parentDirectory);
  mkdirSync(repositoryParent, { recursive: true });
  const repositoryName =
    url
      .replace(/\.git$/i, '')
      .split('/')
      .pop() || 'beatmap-library';
  const target = path.join(repositoryParent, `${repositoryName}-${branch.replaceAll('/', '-')}`);
  if (isGitRepository(target)) {
    runGit(['fetch', 'origin', branch], target);
    runGit(['checkout', branch], target);
    runGit(['pull', '--ff-only', 'origin', branch], target);
    return target;
  }
  if (existsSync(target))
    throw new Error(`The target folder already exists but is not a Git repository: ${target}`);
  const result = spawnSync('git', ['clone', '--branch', branch, '--single-branch', url, target], {
    cwd: repositoryParent,
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.status !== 0) {
    const details = `${result.stderr ?? result.stdout ?? ''}`.trim();
    throw new Error(details || `git clone failed with exit code ${result.status ?? 'unknown'}`);
  }
  return target;
}

function runGit(args: string[], cwd: string): void {
  const result = spawnSync('git', args, { cwd, stdio: 'inherit', windowsHide: true });
  if (result.status !== 0) throw new Error(`git ${args[0]} failed with exit code ${result.status}`);
}
