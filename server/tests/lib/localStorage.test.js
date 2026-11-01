import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { createLocalStorage } from '../../src/lib/storage/localStorage.js';

describe('createLocalStorage', () => {
  let rootDir;
  let storage;

  beforeEach(async () => {
    rootDir = await mkdtemp(path.join(os.tmpdir(), 'storage-test-'));
    storage = createLocalStorage({ rootDir });
  });

  it('moves a file into storage and reports its size', async () => {
    const source = path.join(rootDir, 'incoming.txt');
    await writeFile(source, 'hello');

    const size = await storage.put('videos/abc/source.txt', source);

    expect(size).toBe(5);
    expect(await readFile(await storage.toLocalPath('videos/abc/source.txt'), 'utf8')).toBe(
      'hello',
    );
  });

  it('removes everything under a prefix', async () => {
    const source = path.join(rootDir, 'incoming.txt');
    await writeFile(source, 'hello');
    await storage.put('videos/abc/renditions/360p.mp4', source);

    await storage.remove('videos/abc');

    await expect(readFile(path.join(rootDir, 'videos/abc/renditions/360p.mp4'))).rejects.toThrow();
  });

  it.each(['../outside.txt', 'videos/../../outside.txt', '/etc/passwd'])(
    'refuses keys that escape the storage root: %s',
    async (key) => {
      await expect(storage.toLocalPath(key)).rejects.toThrow(/escapes the storage root/);
    },
  );
});
