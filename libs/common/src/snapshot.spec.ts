import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  diffNewScreenings,
  hasSnapshotChanged,
  loadSnapshot,
  mergeSnapshot,
  reconcileSnapshot,
  saveSnapshot,
} from './snapshot';

describe('reconcileSnapshot', () => {
  const activeDates = ['20260825'];

  it('saves when only past dates were pruned', () => {
    const previous = { '20260101': ['old'], '20260825': ['a'] };

    expect(
      reconcileSnapshot(previous, { '20260825': ['a'] }, activeDates, false),
    ).toEqual({ snapshot: { '20260825': ['a'] }, shouldSave: true });
  });

  it('saves when keys changed', () => {
    expect(
      reconcileSnapshot(
        { '20260825': ['a'] },
        { '20260825': ['a', 'b'] },
        activeDates,
        true,
      ),
    ).toEqual({ snapshot: { '20260825': ['a', 'b'] }, shouldSave: true });
  });

  it('does not save when nothing changed and nothing was pruned', () => {
    expect(
      reconcileSnapshot(
        { '20260825': ['a'] },
        { '20260825': ['a'] },
        activeDates,
        false,
      ),
    ).toEqual({ snapshot: { '20260825': ['a'] }, shouldSave: false });
  });

  it('keeps the previous snapshot instead of overwriting it with an empty one', () => {
    const previous = { '20260101': ['old'] };

    expect(reconcileSnapshot(previous, {}, activeDates, false)).toEqual({
      snapshot: previous,
      shouldSave: false,
    });
  });

  it('does not save when both previous and merged snapshots are empty', () => {
    expect(reconcileSnapshot({}, {}, activeDates, false)).toEqual({
      snapshot: {},
      shouldSave: false,
    });
  });
});

describe('mergeSnapshot', () => {
  it('drops dates outside the active dates (e.g. past dates)', () => {
    const previous = { '20260101': ['old'], '20260825': ['a'] };

    expect(mergeSnapshot(previous, {}, ['20260825'])).toEqual({
      '20260825': ['a'],
    });
  });

  it('keeps the previous value for an active date that failed this cycle', () => {
    const previous = { '20260825': ['a'], '20260826': ['b'] };
    const current = { '20260826': ['b', 'c'] };

    expect(mergeSnapshot(previous, current, ['20260825', '20260826'])).toEqual({
      '20260825': ['a'],
      '20260826': ['b', 'c'],
    });
  });

  it('prefers the current value over the previous one', () => {
    expect(
      mergeSnapshot({ '20260825': ['a'] }, { '20260825': ['z'] }, ['20260825']),
    ).toEqual({ '20260825': ['z'] });
  });

  it('omits active dates that have neither a previous nor current value', () => {
    expect(mergeSnapshot({}, {}, ['20260825'])).toEqual({});
  });

  it('does not mutate its inputs', () => {
    const previous = { '20260101': ['old'] };
    const current = { '20260825': ['a'] };

    mergeSnapshot(previous, current, ['20260825']);

    expect(previous).toEqual({ '20260101': ['old'] });
    expect(current).toEqual({ '20260825': ['a'] });
  });
});

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
