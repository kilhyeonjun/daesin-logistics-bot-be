# 대신물류 배차현황 카카오톡 챗봇

대신물류 배차현황 데이터를 크롤링하여 카카오톡 챗봇으로 조회할 수 있는 서비스입니다.

## 주요 기능

- **자동 크롤링**: 월~토 오전 6시, 오후 2시 배차현황 자동 수집
- **데이터 저장**: SQLite DB에 저장 및 이력 관리
- **카카오톡 챗봇**: 노선코드, 차량번호, 도착지 검색
- **REST API**: 외부 시스템 연동용 API 제공

## 기술 스택

| 영역 | 기술 |
|------|------|
| 런타임 | Node.js 20+ (ESM) |
| 언어 | TypeScript |
| 웹 프레임워크 | Express 5 |
| ORM | Prisma (SQLite) |
| DI 컨테이너 | TSyringe |
| 크롤링 | Cheerio + Axios |
| 스케줄링 | node-cron |
| 컨테이너 | Docker |

## 아키텍처

Clean Architecture + Dependency Injection 패턴을 따릅니다.

```
src/
├── domain/           # 핵심 비즈니스 로직 (외부 의존성 없음)
│   ├── entities/     # Route 엔티티
│   ├── repositories/ # IRouteRepository 인터페이스
│   ├── ports/        # ICrawler 인터페이스
│   └── value-objects/# LineCode, SearchDate 값 객체
├── application/      # 유스케이스 (비즈니스 로직 조율)
│   ├── use-cases/    # SearchByCode, SearchByName, SyncRoutes 등
│   └── dto/          # 데이터 전송 객체
├── infrastructure/   # 외부 구현체
│   ├── persistence/  # PrismaRouteRepository
│   └── crawling/     # CheerioHttpCrawler
├── interface/        # 진입점
│   ├── http/         # REST API 컨트롤러
│   └── kakao/        # 카카오 스킬 서버
└── config/           # DI 컨테이너, 환경설정
```

---

## 설치 및 실행

### 사전 요구사항

- Node.js 20+
- npm 또는 yarn
- Docker (선택)

### 로컬 설치

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env

# 데이터베이스 초기화
npx prisma db push

# 개발 서버 실행
npm run dev
```

### Docker 실행 (권장)

```bash
# 데이터 디렉토리 생성
mkdir -p data

# 빌드 및 실행
docker compose up -d

# 로그 확인
docker logs -f daesin-logistics-bot
```

---

## 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `PORT` | 서버 포트 | `3000` |
| `NODE_ENV` | 실행 환경 | `development` |
| `DATABASE_URL` | SQLite DB 경로 | `file:/app/data/logistics.db` |

---

## 데이터베이스

### 저장 위치

- **로컬**: `./logistics.db`
- **Docker**: `./data/logistics.db` (볼륨 마운트)

Docker 볼륨으로 호스트에 마운트되어 컨테이너 재시작 시에도 데이터가 유지됩니다.

### 스키마

```prisma
model Route {
  id          Int      @id @default(autoincrement())
  searchDate  String   // 검색 날짜 (YYYYMMDD)
  lineCode    String   // 노선 코드 (6자리)
  lineName    String?  // 노선명 (출발→도착)
  carCode     String?  // 차량 코드
  carNumber   String?  // 차량 번호
  count       Int?     // 건수
  quantity    Int?     // 수량
  sectionFare Float?   // 구간 운임
  totalFare   Float?   // 총 운임
  createdAt   String?  // 생성 시각

  @@unique([searchDate, lineCode])
}
```

### 수동 마이그레이션

```bash
# 스키마 변경 후 적용
npx prisma db push

# Prisma 클라이언트 재생성
npx prisma generate
```

---

## 스케줄링

node-cron을 사용하여 서버 프로세스 내부에서 스케줄링됩니다.

| 스케줄 | 시간 | 설명 |
|--------|------|------|
| 월~토 | 오전 6시 | 당일 배차현황 크롤링 |
| 월~토 | 오후 2시 | 당일 배차현황 업데이트 |
| 서버 시작 | 즉시 | 초기 동기화 1회 실행 |

```typescript
// cron 표현식: 0 6,14 * * 1-6
cron.schedule('0 6,14 * * 1-6', async () => {
  await syncUseCase.execute();
});
```

컨테이너가 재시작되어도 스케줄은 자동으로 다시 등록됩니다.

---

## API 엔드포인트

### 헬스체크

```
GET /health
```

```json
{"status": "ok", "timestamp": "2026-01-24T12:30:00.000Z"}
```

### 노선 검색

```
GET /api/routes/code/:code    # 노선코드로 검색
GET /api/routes/name/:name    # 노선명으로 검색
GET /api/routes/car/:number   # 차량번호로 검색
GET /api/routes/date/:date    # 날짜별 검색 (YYYYMMDD)
```

### 통계 조회

```
GET /api/stats/:date
```

```json
{
  "totalRoutes": 729,
  "totalCount": 110283,
  "totalQuantity": 161219,
  "totalSectionFare": 664355601.2,
  "totalFare": 769223956
}
```

### 수동 동기화

```
POST /api/sync
Content-Type: application/json

{"date": "20260124"}
```

### 카카오 스킬

```
POST /kakao/skill
```

---

## 카카오톡 챗봇

### 명령어

| 명령어 | 설명 | 예시 |
|--------|------|------|
| `노선 {코드}` | 노선코드로 검색 | 노선 101102 |
| `차량 {번호}` | 차량번호로 검색 | 차량 4536 |
| `도착 {지역}` | 노선명/도착지로 검색 | 도착 연희동 |
| `오늘 현황` | 오늘 전체 현황 | 오늘 현황 |
| `어제 현황` | 어제 전체 현황 | 어제 현황 |
| `도움말` | 사용법 보기 | 도움말 |

### 카카오 채널 연동

1. [카카오 비즈니스](https://business.kakao.com) 가입 및 채널 생성
2. [카카오 i 오픈빌더](https://i.kakao.com) 접속
3. 봇 생성 후 스킬 등록
   - 스킬 URL: `https://your-domain.com/kakao/skill`
4. 시나리오 블록에 스킬 연결

---

## Docker 운영

### 명령어

```bash
# 시작
docker compose up -d

# 중지
docker compose down

# 로그 확인
docker logs -f daesin-logistics-bot

# 재시작
docker compose restart

# 업데이트 배포
git pull && docker compose up -d --build
```

### 데이터 백업

```bash
# DB 파일 백업
cp ./data/logistics.db ./backup/logistics_$(date +%Y%m%d).db
```

---

## 개발

### 명령어

```bash
npm run dev          # 개발 서버 (hot reload)
npm run build        # TypeScript 빌드
npm start            # 프로덕션 서버
npm test             # 테스트 실행
npm run test:watch   # 테스트 감시 모드
npm run sync         # 수동 데이터 동기화
```

### 테스트

```bash
# 전체 테스트
npm test

# 특정 파일
npx vitest run tests/api.test.ts

# 특정 테스트
npx vitest run -t "헬스체크"
```

---

## 라이선스

ISC
