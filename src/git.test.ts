import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { commitAndPush, prepareForPush } from './git.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('Git synchronization', () => {
  it('pushes existing local commits even when the current sync has no file diff', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'osu-maps-git-'));
    temporaryDirectories.push(directory);
    const remote = path.join(directory, 'remote.git');
    const repository = path.join(directory, 'library');

    git(['init', '--bare', remote], directory);
    git(['init', '--initial-branch=main', repository], directory);
    git(['config', 'user.name', 'Test User'], repository);
    git(['config', 'user.email', 'test@example.com'], repository);
    await writeFile(path.join(repository, 'beatmaps.json'), '{"version":1,"beatmapsets":[]}\n');
    await writeFile(path.join(repository, 'README.md'), '# Library\n');
    git(['add', '.'], repository);
    git(['commit', '-m', 'Initial library'], repository);
    git(['remote', 'add', 'origin', remote], repository);
    git(['push', '--set-upstream', 'origin', 'main'], repository);

    await writeFile(path.join(repository, 'README.md'), '# Updated library\n');
    git(['add', 'README.md'], repository);
    git(['commit', '-m', 'Unpushed update'], repository);

    const result = commitAndPush('No additional diff', repository);
    const localHead = git(['rev-parse', 'HEAD'], repository);
    const remoteHead = git(['--git-dir', remote, 'rev-parse', 'refs/heads/main'], directory);

    expect(result.committed).toBe(false);
    expect(result.commit).toBe(localHead.slice(0, 7));
    expect(remoteHead).toBe(localHead);
  });

  it('fast-forwards a clean library before a push', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'osu-maps-pull-'));
    temporaryDirectories.push(directory);
    const remote = path.join(directory, 'remote.git');
    const library = path.join(directory, 'library');
    const other = path.join(directory, 'other');

    git(['init', '--bare', remote], directory);
    git(['init', '--initial-branch=main', library], directory);
    configureIdentity(library);
    await writeFile(path.join(library, 'beatmaps.json'), '{"version":1,"beatmapsets":[]}\n');
    await writeFile(path.join(library, 'README.md'), '# Library\n');
    git(['add', '.'], library);
    git(['commit', '-m', 'Initial library'], library);
    git(['remote', 'add', 'origin', remote], library);
    git(['push', '--set-upstream', 'origin', 'main'], library);

    git(['clone', '--branch', 'main', remote, other], directory);
    configureIdentity(other);
    await writeFile(path.join(other, 'README.md'), '# Remote update\n');
    git(['add', 'README.md'], other);
    git(['commit', '-m', 'Remote update'], other);
    git(['push'], other);

    expect(prepareForPush(library)).toEqual({ pulled: true });
    expect(git(['rev-parse', 'HEAD'], library)).toBe(git(['rev-parse', 'HEAD'], other));
  });
});

function configureIdentity(repository: string): void {
  git(['config', 'user.name', 'Test User'], repository);
  git(['config', 'user.email', 'test@example.com'], repository);
}

function git(args: string[], cwd: string): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8', windowsHide: true }).trim();
}
