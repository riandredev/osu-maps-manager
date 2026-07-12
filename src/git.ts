import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { root } from './manifest.js';

export type PushResult = {
  branch: string;
  commit: string;
  committed: boolean;
};

export function prepareForPush(cwd = root): { pulled: boolean } {
  const branch = requiredGitOutput(['branch', '--show-current'], cwd);
  runGit(['fetch', 'origin', branch], cwd);
  const [ahead = 0, behind = 0] = requiredGitOutput(
    ['rev-list', '--left-right', '--count', `HEAD...origin/${branch}`],
    cwd,
  )
    .split(/\s+/)
    .map(Number);
  if (ahead > 0 && behind > 0) {
    throw new Error(
      `Local ${branch} and origin/${branch} have diverged (${ahead} local, ${behind} remote commits). Resolve the Git history in the library folder before syncing again.`,
    );
  }
  if (behind === 0) return { pulled: false };
  const changes = requiredGitOutput(['status', '--porcelain'], cwd);
  if (changes) {
    throw new Error(
      `origin/${branch} has ${behind} newer commit${behind === 1 ? '' : 's'}, but the library has uncommitted changes. Commit or discard them before syncing again.`,
    );
  }
  runGit(['pull', '--ff-only', 'origin', branch], cwd);
  return { pulled: true };
}

export function commitAndPush(message: string, cwd = root): PushResult {
  runGit(['add', 'beatmaps.json', 'README.md'], cwd);
  const diff = spawnSync('git', ['diff', '--cached', '--quiet'], { cwd, windowsHide: true });
  const committed = diff.status !== 0;
  if (committed) runGit(['commit', '-m', message], cwd);

  // Push even when this sync produced no new diff. Earlier syncs may have
  // committed locally while the network was unavailable.
  runGit(['push', '--porcelain'], cwd);

  const branch = requiredGitOutput(['branch', '--show-current'], cwd);
  const head = requiredGitOutput(['rev-parse', 'HEAD'], cwd);
  const remoteLine = requiredGitOutput(
    ['ls-remote', '--heads', 'origin', `refs/heads/${branch}`],
    cwd,
  );
  const remoteHead = remoteLine.split(/\s+/)[0];
  if (remoteHead !== head) {
    throw new Error(
      `Git reported success, but origin/${branch} was not updated to ${head.slice(0, 7)}.`,
    );
  }
  return { branch, commit: head.slice(0, 7), committed };
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

function requiredGitOutput(args: string[], cwd: string): string {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throwGitError(args, result.status, result.stderr, result.stdout);
  return result.stdout.trim();
}

function runGit(args: string[], cwd: string): string {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throwGitError(args, result.status, result.stderr, result.stdout);
  return `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
}

function throwGitError(
  args: string[],
  status: number | null,
  stderr: string | null | undefined,
  stdout: string | null | undefined,
): never {
  const details = `${stderr ?? ''}\n${stdout ?? ''}`.trim();
  throw new Error(details || `git ${args[0]} failed with exit code ${status ?? 'unknown'}`);
}
