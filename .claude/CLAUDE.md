# movie-open-notifier

NestJS 모노레포. 영화관 예매 오픈 알리미 (CGV, Megabox)

## 구조

- `apps/cgv-open-notifier` — CGV 예매 오픈(IMAX 등)을 감시해 텔레그램으로 알림을 보내는 프로젝트 (Nest 앱, entry: `src/main.ts`)
- `libs/common` — 공통 유틸/설정 (`@app/common`)
- `libs/telegram` — 텔레그램 알림 연동 (`@app/telegram`)

## 명령어

| 목적 | 명령어 |
|---|---|
| 빌드 | `npm run build` |
| 개발 서버 (watch) | `npm run start:dev` |
| 테스트 | `npm test` |
| 테스트 (watch) | `npm run test:watch` |
| 커버리지 | `npm run test:cov` |
| e2e 테스트 | `npm run test:e2e` |
| 린트 | `npm run lint` |
| 포맷 | `npm run format` |

## 참고

- puppeteer(-extra, stealth 플러그인)로 CGV 예매 페이지를 크롤링.
- 스케줄링은 `@nestjs/schedule` 사용.
- path alias: `@app/common`, `@app/telegram` (tsconfig / jest moduleNameMapper 동기화 필요).
