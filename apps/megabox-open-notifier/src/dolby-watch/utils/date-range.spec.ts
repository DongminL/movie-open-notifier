import { buildDateRange } from './date-range';

describe('buildDateRange', () => {
  it('returns horizonDays - 6 dates in YYYYMMDD format starting 6 days from today', () => {
    const horizonDays = 10;
    const dates = buildDateRange(horizonDays);

    expect(dates).toHaveLength(horizonDays - 6);
    dates.forEach((date) => expect(date).toMatch(/^\d{8}$/));

    const expectedFirst = new Date();
    expectedFirst.setDate(expectedFirst.getDate() + 6);
    const expected =
      String(expectedFirst.getFullYear()) +
      String(expectedFirst.getMonth() + 1).padStart(2, '0') +
      String(expectedFirst.getDate()).padStart(2, '0');

    expect(dates[0]).toBe(expected);
  });

  it('returns an empty array when horizonDays is 6 or less', () => {
    expect(buildDateRange(6)).toEqual([]);
  });
});
