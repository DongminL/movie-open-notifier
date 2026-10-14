import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  diffNewScreenings,
  hasSnapshotChanged,
  loadSnapshot,
  saveSnapshot,
} from './snapshot';

describe('hasSnapshotChanged', () => {
  it('is true when there was no previous snapshot', () => {
    expect(hasSnapshotChanged(undefined, ['a'])).toBe(true);
  });

  it('is true when the key count differs', () => {
    expect(hasSnapshotChanged(['a'], ['a', 'b'])).toBe(true);
  });

  it('is true when a key at the same position differs', () => {
    expect(hasSnapshotChanged(['a', 'b'], ['a', 'c'])).toBe(true);
  });

  it('is false when keys match in order and content', () => {
    expect(hasSnapshotChanged(['a', 'b'], ['a', 'b'])).toBe(false);
  });
});

describe('diffNewScreenings', () => {
  const items = [{ id: 'a' }, { id: 'b' }];
  const keys = ['a', 'b'];

  it('returns all items when there is no previous snapshot (cold start)', () => {
    expect(diffNewScreenings(undefined, items, keys)).toEqual(items);
  });

  it('returns only items whose key is not in the previous snapshot', () => {
    expect(diffNewScreenings(['a'], items, keys)).toEqual([{ id: 'b' }]);
  });
});

describe('snapshot file', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'snapshot-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('returns null and creates an empty snapshot file when the file does not exist', async () => {
    const path = join(dir, 'missing.json');

    expect(loadSnapshot(path)).toBeNull();
    expect(JSON.parse(await readFile(path, 'utf-8'))).toEqual({});
  });

  it('creates missing parent directories when the file does not exist', async () => {
    const path = join(dir, 'data', 'nested', 'snap.json');

    expect(loadSnapshot(path)).toBeNull();
    expect(JSON.parse(await readFile(path, 'utf-8'))).toEqual({});
  });

  it('returns null for an empty snapshot object (cold start)', async () => {
    const path = join(dir, 'empty.json');
    await writeFile(path, '{}', 'utf-8');

    expect(loadSnapshot(path)).toBeNull();
  });

  it('round-trips a snapshot, creating parent directories', async () => {
    const path = join(dir, 'nested', 'snap.json');
    const snapshot = { '20260825': ['a', 'b'] };

    await saveSnapshot(path, snapshot);

    expect(loadSnapshot(path)).toEqual(snapshot);
    expect(JSON.parse(await readFile(path, 'utf-8'))).toEqual(snapshot);
  });

  it('propagates a parse error for a corrupted file', async () => {
    const path = join(dir, 'broken.json');
    await writeFile(path, '{not json', 'utf-8');

    expect(() => loadSnapshot(path)).toThrow();
  });

  it.each([
    ['an array', '[]'],
    ['a date mapped to a non-array', '{"20260825":"a"}'],
    ['non-string keys', '{"20260825":[1,2]}'],
    ['null', 'null'],
  ])('throws when the file content is %s', async (_, content) => {
    const path = join(dir, 'invalid.json');
    await writeFile(path, content, 'utf-8');

    expect(() => loadSnapshot(path)).toThrow(/스냅샷/);
  });
});
