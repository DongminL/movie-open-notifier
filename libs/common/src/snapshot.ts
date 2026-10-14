import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { mkdir, rename, rm, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { dirname } from 'path';
import * as Joi from 'joi';

// 상영 날짜 -> 상영 회차 키 목록
export type Snapshot = Record<string, string[]>;

// 키가 빈 문자열일 수 있다(응답에 회차 번호가 누락된 항목) — 저장된 스냅샷이 거부되지 않도록 허용
const snapshotSchema = Joi.object()
  .pattern(Joi.string(), Joi.array().items(Joi.string().allow('')))
  .required();

/** 같은 날짜의 이전/현재 키 배열이 순서·내용까지 동일한지 (다르면 스냅샷 저장 필요) */
export const hasSnapshotChanged = (
  prevKeys: string[] | undefined,
  keys: string[],
): boolean =>
  !prevKeys ||
  prevKeys.length !== keys.length ||
  keys.some((k, idx) => k !== prevKeys[idx]);

/** 콜드 스타트가 아닐 때, 이전 스냅샷에 없던 신규 항목만 추려낸다 (keys[i]는 items[i]의 키) */
export function diffNewScreenings<T>(
  prevKeys: string[] | undefined,
  items: T[],
  keys: string[],
): T[] {
  const prevKeySet = prevKeys ? new Set(prevKeys) : null;
  return items.filter((_, idx) => !prevKeySet || !prevKeySet.has(keys[idx]));
}

/**
 * 스냅샷 파일이 없거나 비어 있으면 null(콜드 스타트), 있으면 파싱된 내용을 반환 (파싱/형식 검증 실패 시 예외 전파).
 * 파일이 없으면 빈 스냅샷 `{}`으로 미리 만들어 둔다 — 첫 사이클 전에 재시작돼도 콜드 스타트로 취급된다.
 */
export function loadSnapshot(path: string): Snapshot | null {
  if (!existsSync(path)) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, '{}', 'utf-8');
    return null;
  }

  const parsed: unknown = JSON.parse(readFileSync(path, 'utf-8'));
  const { error } = snapshotSchema.validate(parsed);
  if (error) {
    throw new Error(
      `스냅샷 파일 형식이 올바르지 않습니다 (${path}): ${error.message}`,
    );
  }

  const snapshot = parsed as Snapshot;
  return Object.keys(snapshot).length === 0 ? null : snapshot;
}

export async function saveSnapshot(
  path: string,
  snapshot: Snapshot,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  // 동시 저장 시 파일이 섞여 깨지지 않도록 임시 파일에 쓴 뒤 원자적으로 교체한다
  const tmpPath = `${path}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(tmpPath, JSON.stringify(snapshot, null, 2), 'utf-8');
    await rename(tmpPath, path);
  } catch (error) {
    await rm(tmpPath, { force: true });
    throw error;
  }
}
