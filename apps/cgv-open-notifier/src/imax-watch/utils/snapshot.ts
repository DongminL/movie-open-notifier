import { existsSync, readFileSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { Screening } from '../../cgv/dto/screening.dto';

// scnYmd -> ["scnYmd|scnsNo|scnSseq", ...]
export type Snapshot = Record<string, string[]>;

export const buildScreeningKey = (s: Screening): string =>
  `${s.scnYmd}|${s.scnsNo}|${s.scnSseq}`;

/** 같은 날짜의 이전/현재 키 배열이 순서·내용까지 동일한지 (다르면 스냅샷 저장 필요) */
export const hasSnapshotChanged = (
  prevKeys: string[] | undefined,
  keys: string[],
): boolean =>
  !prevKeys ||
  prevKeys.length !== keys.length ||
  keys.some((k, idx) => k !== prevKeys[idx]);

/** 콜드 스타트가 아닐 때, 이전 스냅샷에 없던 신규 상영만 추려낸다 */
export function diffNewScreenings(
  prevKeys: string[] | undefined,
  screenings: Screening[],
  keys: string[],
): Screening[] {
  const prevKeySet = prevKeys ? new Set(prevKeys) : null;
  return screenings.filter(
    (_, idx) => !prevKeySet || !prevKeySet.has(keys[idx]),
  );
}

/** 스냅샷 파일이 없으면 null, 있으면 파싱된 내용을 반환 (파싱 실패 시 예외 전파) */
export function loadSnapshot(path: string): Snapshot | null {
  if (!existsSync(path)) {
    return null;
  }
  return JSON.parse(readFileSync(path, 'utf-8')) as Snapshot;
}

export async function saveSnapshot(
  path: string,
  snapshot: Snapshot,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(snapshot, null, 2), 'utf-8');
}
