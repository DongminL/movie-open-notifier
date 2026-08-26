const START_OFFSET_DAYS = 6;

/** 오늘부터 6일 후 시작해서 horizonDays 만큼의 YYYYMMDD 목록 */
export function buildDateRange(horizonDays: number): string[] {
  const dates: string[] = [];
  const today = new Date();

  for (let i = START_OFFSET_DAYS; i < horizonDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);

    const year = String(d.getFullYear());
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    dates.push(`${year}${month}${day}`);
  }

  return dates;
}
