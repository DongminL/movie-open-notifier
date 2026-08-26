# 🎬 movie-open-notifier

CGV, 메가박스의 특별관(IMAX, DOLBY CINEMA) 예매 오픈을 감시해서 텔레그램으로 알림을 보내주는 NestJS 모노레포입니다.

## 프로젝트 소개

- `apps/cgv-open-notifier` — CGV 예매 오픈(IMAX 등)을 감시해 텔레그램으로 알림
- `apps/megabox-open-notifier` — 메가박스 예매 오픈(DOLBY CINEMA)을 감시해 텔레그램으로 알림
- `libs/common` — 공통 유틸/설정 (`@app/common`)
- `libs/telegram` — 텔레그램 알림 연동 (`@app/telegram`)

일정 주기로 예매 페이지를 폴링하다가 이전 스냅샷과 비교해 새로운 회차가 열리면 텔레그램 메시지를 전송하는 방식으로 동작합니다.

## 기술 스택

<p>
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Telegram-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" />
  <img src="https://img.shields.io/badge/Puppeteer-40B5A4?style=for-the-badge&logo=puppeteer&logoColor=white" />
  <img src="https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white" />
  <img src="https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white" />
</p>

- **NestJS** — 애플리케이션 프레임워크 (모노레포 구조)
- **TypeScript**
- **@nestjs/schedule** — 주기적 폴링 스케줄링
- **puppeteer / puppeteer-extra (stealth)** — CGV 예매 페이지 크롤링
- **telegraf / nestjs-telegraf** — 텔레그램 봇 알림
- **Jest** — 단위/e2e 테스트

## 준비 사항

1. Node.js 설치 (v20 이상, `@types/node`가 v24 기준이라 최신 LTS 권장)
2. 의존성 설치
   ```bash
   npm install
   ```
3. 텔레그램 봇 준비 ([참고](https://gabrielkim.tistory.com/entry/Telegram-Bot-Token-%EB%B0%8F-Chat-Id-%EC%96%BB%EA%B8%B0))
   - [@BotFather](https://t.me/BotFather)로 봇을 생성하고 봇 토큰 발급
   - 알림을 받을 채팅/채널의 chat ID 확인
4. 각 앱의 `.env` 파일 생성

   `apps/cgv-open-notifier/.env`
   ```env
   TELEGRAM_BOT_TOKEN=
   TELEGRAM_CHAT_ID=
   CGV_IMAX_URL=https://cgv.co.kr/cnm/movieBook/cinema
   WATCH_HORIZON_DAYS=25
   WATCH_POLL_INTERVAL_SEC=22
   IMAX_SNAPSHOT_PATH=data/imax-snapshot.json
   ```

   `apps/megabox-open-notifier/.env`
   ```env
   TELEGRAM_BOT_TOKEN=
   TELEGRAM_CHAT_ID=
   MEGABOX_SCHEDULE_URL=https://www.megabox.co.kr/on/oh/ohc/Brch/schedulePage.do
   WATCH_HORIZON_DAYS=25
   WATCH_POLL_INTERVAL_SEC=22
   DOLBY_SNAPSHOT_PATH=data/dolby-snapshot.json
   ```

## 서버 실행

| 목적 | 명령어 |
|---|---|
| 빌드 (전체) | `npm run build` |
| CGV 실행 | `npm run start:cgv` |
| CGV 개발 서버 (watch) | `npm run start:dev:cgv` |
| CGV 프로덕션 실행 | `npm run build:cgv && npm run start:prod:cgv` |
| 메가박스 실행 | `npm run start:megabox` |
| 메가박스 개발 서버 (watch) | `npm run start:dev:megabox` |
| 메가박스 프로덕션 실행 | `npm run build:megabox && npm run start:prod:megabox` |
| 테스트 | `npm test` |
| 커버리지 | `npm run test:cov` |
| e2e 테스트 (CGV) | `npm run test:e2e:cgv` |
| e2e 테스트 (메가박스) | `npm run test:e2e:megabox` |
| 린트 | `npm run lint` |
| 포맷 | `npm run format` |
