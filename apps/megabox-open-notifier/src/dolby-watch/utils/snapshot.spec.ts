import { Screening } from '../../megabox/dto/screening.dto';
import {
  buildScreeningKey,
  diffNewScreenings,
  hasSnapshotChanged,
} from './snapshot';

const buildScreening = (overrides: Partial<Screening>): Screening => ({
  playSchdlNo: '2608260019001',
  movieNm: '영화 제목',
  screenType: 'DOLBY CINEMA [Laser]',
  playStartTime: '10:00',
  playEndTime: '12:20',
  seatInfo: '100/290',
  playDe: '20260826',
  ...overrides,
});

describe('buildScreeningKey', () => {
  it('uses playSchdlNo as-is since it already uniquely identifies a showing', () => {
    expect(
      buildScreeningKey(buildScreening({ playSchdlNo: '2608260019003' })),
    ).toBe('2608260019003');
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
    const screenings = [buildScreening({ playSchdlNo: '1' })];
    const keys = screenings.map(buildScreeningKey);

    expect(diffNewScreenings(undefined, screenings, keys)).toEqual(screenings);
  });

  it('returns only screenings whose key is not in the previous snapshot', () => {
    const kept = buildScreening({ playSchdlNo: '1' });
    const added = buildScreening({ playSchdlNo: '2' });
    const screenings = [kept, added];
    const keys = screenings.map(buildScreeningKey);
    const prevKeys = [buildScreeningKey(kept)];

    expect(diffNewScreenings(prevKeys, screenings, keys)).toEqual([added]);
  });
});
