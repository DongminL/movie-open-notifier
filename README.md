# 🎬 movie-open-notifier

CGV, 메가박스의 특별관(IMAX, 4DX, SCREENX, DOLBY CINEMA, 무대인사, GV, 굿즈패키지) 예매 오픈을 감시해서 텔레그램으로 알림을 보내주는 NestJS 모노레포입니다.

## 프로젝트 소개

- `apps/cgv-open-notifier` — CGV 예매 오픈(IMAX, 4DX, SCREENX)을 감시해 텔레그램으로 알림
- `apps/megabox-open-notifier` — 메가박스 예매 오픈(DOLBY CINEMA, 무대인사, GV, 굿즈패키지)을 감시해 텔레그램으로 알림
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
   TELEGRAM_CHAT_ID_IMAX=       # IMAX 알림 채팅방 (오류 알림도 여기로 전송)
   TELEGRAM_CHAT_ID_4DX=        # 4DX 알림 채팅방 (생략하면 TELEGRAM_CHAT_ID_IMAX 사용)
   TELEGRAM_CHAT_ID_SCREENX=    # SCREENX 알림 채팅방 (생략하면 TELEGRAM_CHAT_ID_IMAX 사용)
   CGV_IMAX_URL=https://cgv.co.kr/cnm/movieBook/cinema
   WATCH_HORIZON_DAYS=25
   WATCH_POLL_INTERVAL_SEC=22
   IMAX_SNAPSHOT_PATH=data/imax-snapshot.json
   FOURDX_SNAPSHOT_PATH=data/4dx-snapshot.json
   SCREENX_SNAPSHOT_PATH=data/screenx-snapshot.json
   ```

   `apps/megabox-open-notifier/.env`
   ```env
   TELEGRAM_BOT_TOKEN=

   # 유형별 알림 채팅방 + 지점별 토픽(message_thread_id)
   # - DOLBY 채팅방은 필수(기본 채팅방, 오류 알림도 여기로 전송). 나머지 채팅방은 생략하면 DOLBY 방 사용
   # - 토픽은 포럼(토픽) 활성화된 그룹에서만 사용. 생략하면 토픽 없이 전송
   # - 지점 코드: 0019 남양주현대아울렛스페이스원 / 1351 코엑스 / 1212 홍대
   TELEGRAM_CHAT_ID_DOLBY=
   TELEGRAM_TOPIC_ID_DOLBY_0019=
   TELEGRAM_TOPIC_ID_DOLBY_1351=
   TELEGRAM_TOPIC_ID_DOLBY_1212=

   TELEGRAM_CHAT_ID_STAGE_GREETING=
   TELEGRAM_TOPIC_ID_STAGE_GREETING_0019=
   TELEGRAM_TOPIC_ID_STAGE_GREETING_1351=
   TELEGRAM_TOPIC_ID_STAGE_GREETING_1212=

   TELEGRAM_CHAT_ID_GV=
   TELEGRAM_TOPIC_ID_GV_0019=
   TELEGRAM_TOPIC_ID_GV_1351=
   TELEGRAM_TOPIC_ID_GV_1212=

   TELEGRAM_CHAT_ID_GOODS_PACKAGE=
   TELEGRAM_TOPIC_ID_GOODS_PACKAGE_0019=
   TELEGRAM_TOPIC_ID_GOODS_PACKAGE_1351=
   TELEGRAM_TOPIC_ID_GOODS_PACKAGE_1212=

   MEGABOX_SCHEDULE_URL=https://www.megabox.co.kr/on/oh/ohc/Brch/schedulePage.do
   WATCH_HORIZON_DAYS=25
   WATCH_POLL_INTERVAL_SEC=22
   ```

   선택 항목 (생략 가능, 기본값 사용)
   ```env
   TELEGRAM_CHAT_ID=                  # 기본 오류 알림 채팅방 (기본값: TELEGRAM_CHAT_ID_DOLBY)
   DOLBY_SNAPSHOT_PATH=data/dolby-snapshot.json
   STAGE_GREETING_SNAPSHOT_PATH=data/stage-greeting-snapshot.json
   GV_SNAPSHOT_PATH=data/gv-snapshot.json
   GOODS_PACKAGE_SNAPSHOT_PATH=data/goods-package-snapshot.json
   # *_SNAPSHOT_PATH는 기준 경로이며, 실제 파일은 지점마다 `-{brchNo}`가 붙는다 (예: data/dolby-snapshot-0019.json)
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
