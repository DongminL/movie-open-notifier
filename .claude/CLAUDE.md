# movie-open-notifier

NestJS 모노레포. 영화관 예매 오픈 알리미 (CGV, Megabox)

## 구조

- `apps/cgv-open-notifier` — CGV 예매 오픈(IMAX, 4DX, SCREENX)을 감시해 텔레그램으로 알림을 보내는 프로젝트 (Nest 앱, entry: `src/main.ts`). 포맷별 차이(필터/스냅샷/채팅방)는 `screening-watch/watch-strategy.ts`의 전략으로 분리
- `apps/megabox-open-notifier` — 메가박스 예매 오픈(DOLBY CINEMA, 무대인사, GV)을 감시해 텔레그램으로 알림을 보내는 프로젝트 (Nest 앱, entry: `src/main.ts`). schedulePage.do API는 토큰/쿠키 검사가 없어 Puppeteer 없이 순수 fetch로 조회. 유형별 차이(필터/스냅샷/채팅방)는 `screening-watch/strategies/`의 전략으로 분리 (DBC=theabKindCd, 무대인사 MEK01 / GV MEK06=eventDivCd)
- `libs/common` — 공통 유틸/설정 (`@app/common`)
- `libs/telegram` — 텔레그램 알림 연동 (`@app/telegram`)

## 참고

- path alias: `@app/common`, `@app/telegram` (tsconfig / jest moduleNameMapper 동기화 필요).
