import { Screening } from '../../cgv/dto/screening.dto';
import {
  buildScreeningKey,
  diffNewScreenings,
  hasSnapshotChanged,
} from './snapshot';

const buildScreening = (overrides: Partial<Screening>): Screening => ({
  scnYmd: '20260825',
  scnsNo: '018',
  scnSseq: '1',
  movNm: '영화 제목',
  scnsrtTm: '1000',
  scnendTm: '1220',
  seatInfo: '100/120',
  tcscnsGradCd: '03',
  scnsEnm: 'IMAX',
  ...overrides,
});

describe('buildScreeningKey', () => {
  it('joins scnYmd, scnsNo, scnSseq with a pipe', () => {
    expect(buildScreeningKey(buildScreening({}))).toBe('20260825|018|1');
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
  it('returns all screenings when there is no previous snapshot (cold start)', () => {
    const screenings = [buildScreening({ scnSseq: '1' })];
    const keys = screenings.map(buildScreeningKey);

    expect(diffNewScreenings(undefined, screenings, keys)).toEqual(screenings);
  });

  it('returns only screenings whose key is not in the previous snapshot', () => {
    const kept = buildScreening({ scnSseq: '1' });
    const added = buildScreening({ scnSseq: '2' });
    const screenings = [kept, added];
    const keys = screenings.map(buildScreeningKey);
    const prevKeys = [buildScreeningKey(kept)];

    expect(diffNewScreenings(prevKeys, screenings, keys)).toEqual([added]);
  });
});
