/** 로그 출력용: Error면 스택, 아니면 원본 값 그대로 */
export const getErrorStack = (err: unknown): unknown =>
  err instanceof Error ? err.stack : err;
