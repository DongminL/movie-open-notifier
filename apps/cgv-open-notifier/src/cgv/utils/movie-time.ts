export interface MovieTimeOption {
  startTime: string;
  endTime: string;
  movie: string;
  screenType: string;
  seatInfo: string;
}

export function buildScheduleMessage(
  movieTimeMap: Map<string, MovieTimeOption[]>,
  targetTheater: string,
  date: string,
): string {
  if (date.length !== 8) {
    throw new Error('date의 형식은 20250101 이어야 합니다.');
  }

  let result =
    `CGV ${targetTheater} 상영 시간표\n` +
    `${date.substring(0, 4)}년 ${date.substring(4, 6)}월 ${date.substring(6, 8)}일\n` +
    'IMAX 오픈\n\n';

  movieTimeMap.forEach((timeList, movie) => {
    result += `🎬 ${movie}\n`;

    timeList.forEach((time) => {
      result += `${time.startTime} ~ ${time.endTime} | 좌석수: ${time.seatInfo}\n`;
    });
    result += '\n';
  });

  return result;
}
