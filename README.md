# 대신물류 배차현황 웹 백엔드

대신물류 배차현황을 수집하고 웹 프론트엔드에 조회 API를 제공하는 백엔드입니다.

- 공개 프론트엔드: https://daesin.kilpenguin.com
- 프론트엔드 저장소: https://github.com/kilhyeonjun/daesin-logistics-bot-fe

## 주요 기능

- **자동 수집**: 월~토 06:00~20:00 KST, 매시 정각 배차현황 수집
- **데이터 저장**: SQLite DB에 저장 및 이력 관리
- **웹 조회**: 노선코드, 차량번호, 도착지 검색 및 통계 API 제공
- **안전한 운영**: 단일 스케줄러와 Blue-Green 수동 롤백

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
│   └── http/         # REST API 컨트롤러
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
| `API_KEY` | API 요청 키 (`production`에서 필수) | 없음 |

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

웹 복제본과 분리된 `scheduler` 컨테이너 하나가 `Asia/Seoul` 기준으로 수집을 실행합니다.

| 스케줄 | 시간 | 설명 |
|--------|------|------|
| 월~토 | 오전 6시 ~ 오후 8시 | 매시 정각 크롤링 (1시간 간격) |
| 스케줄러 시작 | 즉시 | 초기 동기화 1회 실행 |

```typescript
// cron 표현식: 0 6-20 * * 1-6
cron.schedule('0 6-20 * * 1-6', async () => {
  await syncUseCase.execute();
});
```

Blue/Green 웹 복제본에는 스케줄러가 없으므로 배포 중에도 예약 작업이 중복 실행되지 않습니다.

---

## API 엔드포인트

`/health`를 제외한 모든 API 요청에는 서버 간 `x-api-key`가 필요합니다. 관리 API는 로그인으로 발급된 `Authorization: Bearer <token>`도 함께 요구합니다.

```bash
curl -H 'x-api-key: <API_KEY>' http://localhost/api/routes/date/20260124
```

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
x-api-key: <API_KEY>
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{"date": "20260124"}
```

## Docker 운영

### 아키텍처

Traefik 리버스 프록시를 사용한 Blue-Green 배포 구조:

```
Internet
  ↓
Tailscale Funnel (HTTPS, *.ts.net)
  ↓
localhost:80
  ↓
Traefik (리버스 프록시)
  ├── app-blue (활성)   ─┐
  └── app-green (대기)  ─┴── SQLite DB (./data)
scheduler (singleton, KST) ────┘
```

| 컴포넌트 | 역할 | 포트 |
|----------|------|------|
| Traefik | 리버스 프록시, 라우팅, 헬스체크 | 80 (웹), 8080 (대시보드) |
| app-blue | 프로덕션 서비스 (Blue) | 3000 (내부) |
| app-green | 프로덕션 서비스 (Green) | 3000 (내부) |
| scheduler | 초기 1회 + 월~토 06:00~20:00 KST 수집 | 없음 |

### 명령어

```bash
# 시작 (Blue 활성, 기본값)
docker compose up -d

# 중지
docker compose down

# 로그 확인
docker logs -f app-blue
docker logs -f traefik

# Traefik 대시보드
open http://localhost:8080/dashboard/
```

### Blue-Green 배포

비활성 슬롯을 먼저 검증한 뒤 Traefik 라우팅을 전환합니다. 실제 다운타임 0초를 보장하는 표현은 사용하지 않습니다.

#### 자동 배포 스크립트

```bash
# git pull + build + Blue-Green 전환
./scripts/deploy.sh
```

스크립트는 `traefik/dynamic.yml`의 실제 라우팅 대상을 기준으로:
1. 최신 코드 pull
2. 새 이미지 빌드
3. 비활성 서비스 시작
4. 후보 슬롯 헬스체크
5. 트래픽 전환 및 라우팅 헬스체크
6. singleton 스케줄러 갱신
7. 이전 서비스 정리

전환 후 헬스체크가 실패하면 이전 서비스를 중지하지 않고 종료합니다. 원인 확인 후 아래 명령으로 **수동 롤백**합니다.

#### 수동 Blue-Green 전환

```bash
# 현재 Traefik 라우팅 대상 확인
./switch-traffic.sh status

# 예: Green에서 Blue로 수동 롤백
docker compose up -d app-blue
./switch-traffic.sh blue

# 예: Blue에서 Green으로 수동 롤백
docker compose up -d app-green
./switch-traffic.sh green
```

### Tailscale Funnel 설정

Traefik 도입으로 Funnel 포트가 변경됩니다:

```bash
# 기존 포트 3000 → 새 포트 80
tailscale funnel --bg localhost:80

# 기존 funnel 제거 (필요시)
tailscale funnel off localhost:3000
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
