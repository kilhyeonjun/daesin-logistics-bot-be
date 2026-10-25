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
| 런타임 | Node.js 20.18.1+ (ESM) |
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

- Node.js 20.18.1+
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

아래 롤백 명령은 이전 컨테이너가 삭제·재생성되지 않았고, 그 컨테이너의 이미지 ID가 배포 전 기록과 일치할 때 사용합니다. `docker compose up`은 새 이미지로 컨테이너를 재생성할 수 있으므로 이전 버전 복구를 보장하지 않습니다. 웹 라우팅 전환은 scheduler 이미지나 DB의 복구와 별개입니다. 운영 `traefik/dynamic.yml`의 변경은 현재 라우팅 상태일 수 있으므로 Git 정리 작업으로 덮어쓰지 않습니다.

```bash
# 현재 Traefik 라우팅 대상 확인
./switch-traffic.sh status

# 예: Green에서 Blue로 수동 롤백
docker start app-blue
./switch-traffic.sh blue

# 예: Blue에서 Green으로 수동 롤백
docker start app-green
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

실행 중인 SQLite의 본체 파일만 `cp`하면 WAL에 남은 변경을 놓칠 수 있습니다. SQLite backup API로 고유한 스냅샷을 만들고, 백업 파일 자체를 검사합니다. 아래 경로는 실제 운영 volume 경로와 대조한 뒤 사용합니다.

```bash
umask 077
mkdir -p ./backup
BACKUP_DIR=$(mktemp -d ./backup/predeploy.XXXXXX)
sqlite3 -readonly ./data/logistics.db ".backup '$BACKUP_DIR/logistics.db'"
sqlite3 "$BACKUP_DIR/logistics.db" 'PRAGMA journal_mode=DELETE; PRAGMA integrity_check;'
```

백업 파일과 디렉터리는 각각 0600·0700으로 보관하고 저장소나 공개 CI artifact에 올리지 않습니다. 운영 반영 전에는 별도 경로에 백업을 복사해 체크섬·무결성·조회까지 확인합니다. 이 검증은 운영 DB를 덮어쓰는 복구나 서비스 전환 검증과 다릅니다. 실제 복구는 앱과 scheduler의 쓰기를 중단하고, DB·WAL·이미지 버전을 함께 고려한 별도 절차로 수행합니다.

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

## 수집 품질·최신성 재현

```bash
npm run build
npm run verify:ingestion
```

검증 명령은 합성 EUC-KR 응답을 제공하는 loopback HTTP 서버와 새 임시 SQLite를 만듭니다. 실제 크롤러·동기화 유스케이스·Prisma transaction·조회 유스케이스를 실행하고 JSON 결과를 출력한 뒤 자원을 정리합니다. 운영 DB나 외부 원천 URL을 인자로 받지 않으며, 기존 `DATABASE_URL`도 검증 DB로 사용하지 않습니다. CI에서도 같은 명령을 실행합니다.

| 합성 시나리오 | 검증하는 결과 |
|---|---|
| 아직 공개되지 않은 데이터 | 인식 가능한 빈 표를 빈 결과로 처리 |
| 노선 1개 공개 | 5행 미만 표도 보존하고 `1,234`·`2,345`를 각각 1234·2345로 파싱 |
| 동일 노선 중복·반복 수집 | 날짜·노선코드당 한 행 유지, 최초 `createdAt` 보존 |
| 지연 공개·정정 | 별도 DB 연결의 장수명 조회 객체가 추가·정정 값을 다음 요청에서 확인 |
| 후속 응답에서 기존 노선 누락 | 기존 행을 삭제하지 않는 upsert-only 계약 유지 |
| 원천 HTTP 503 | 한 번의 실패 요청이 기존 저장 상태를 변경하지 않음 |
| 다음 명시적 수집 실행 | 새 값을 반영하며 자동 retry가 있었다고 주장하지 않음 |
| 과거 날짜 정정 | 같은 노선의 날짜별 행을 구분하고 과거 정정도 즉시 조회 |
| 배치 중간 DB 쓰기 실패 | 임시 SQLite trigger가 세 번째 쓰기를 거부하면 앞선 수정·신규 삽입도 롤백되고, 별도 reader에서 기존 행·ID·시각·과거 이력이 유지됨 |
| 쓰기 실패 후 명시적 재실행 | trigger 제거 뒤 동일 배치를 다시 실행하면 수정·신규 행이 함께 보이며 기존 ID·최초 시각과 무관한 행이 보존됨 |

DB 실패 주입은 검증 명령이 만든 임시 DB에서만 수행합니다. 실제 `SyncRoutesUseCase`와 `PrismaRouteRepository`를 사용하며, 예외를 성공으로 바꾸거나 자동 재시도를 추가하지 않습니다. 이 재현은 SQLite transaction의 배치 원자성을 확인하는 것이며 프로세스 강제 종료·전원 손실·운영 장애 복구까지 검증한 것은 아닙니다.

### 선택 실행: 반복 합성 부하·독립 writer 경합 측정

```bash
npm run build
npm run benchmark:ingestion
# npm 배너 없이 실행 로그와 마지막 JSON receipt 저장
node scripts/verify-ingestion-quality.mjs --benchmark > ingestion-benchmark.log
```

`--benchmark`는 위 **10개 기능 시나리오를 먼저 그대로 실행**하고, 같은 loopback 서버·임시 SQLite·실제 crawler/sync/repository/search를 재사용합니다. 기본 `verify:ingestion`은 유지하고 측정은 `--benchmark`로 선택합니다. CI는 두 명령을 모두 실행해 기능·원자성·readback을 확인하되 시간 임계값으로 통과 여부를 정하지 않습니다. 외부 URL·DB 경로나 임의 크기 입력은 받지 않습니다. 각 invocation은 새 임시 DB를 만들고 종료 시 연결·서버·DB를 `finally`에서 정리합니다. 두 실행 명령은 각각 별도 측정이므로 receipt 하나만 필요하면 마지막 `node` 명령만 실행합니다.

- **부하:** 100행, 1,000행 순서로 각각 warmup 1회와 measured 3회(총 8회). 각 회차는 새 합성 날짜에 결정적인 고유 코드·수량을 넣습니다. DB는 invocation 안에서 누적되고 OS/SQLite 캐시를 비우지 않으므로 cold-start 비교가 아닙니다. 수집 시간은 `sync.execute` 시작부터 완료까지의 HTTP·EUC-KR 파싱·transaction 전체이며, 최종 검증 readback은 제외합니다.
- **동시 reader:** 별도 PrismaClient가 수집 중 날짜 전체 SELECT와 실제 코드 검색을 순차 반복합니다. 최대 회차당 1,000개 probe, 미완료 시 1ms 간격이며, 실제 시작 offset·수집 pending 여부·각 조회 시간·관측 행 수를 저장합니다. 단일 날짜 SELECT는 0행 또는 전체 행만 허용하고 필드 값도 확인합니다. 서로 다른 SELECT는 commit 전후를 나누어 볼 수 있습니다. 마지막에는 독립 연결에서 전체 행을 다시 확인합니다. 샘플링 간격이나 완료 시간 자체에는 합격 기준이 없습니다.
- **경합:** warmup 1회와 measured 3회. 세 번째 독립 PrismaClient의 transaction이 기존 행에 실제 UPDATE를 완료하여 writer lock을 획득한 다음에만 contender `sync.execute`를 시작합니다. lock 획득 기준 150ms hold를 목표로 release를 요청하며 실제 hold·release 완료 시각, contender 시작 offset·종료까지의 시간, 성공/거절·오류 name/code와 lock 중 독립 조회 시간·값을 남깁니다. 150ms는 SLA나 시간 assertion이 아니고 스케줄링·조회 지연으로 길어질 수 있습니다. contender 시간은 순수 DB wait가 아니라 transport·파싱을 포함합니다. 엔진이 성공하면 그 결과를, 거절하면 기존 전체 행·ID·시각 보존을 검증한 뒤 **명시적 재실행 1회**의 결과를 기록합니다. 자동 retry·production timeout·동시성 설정은 바꾸지 않습니다.
- **receipt:** `synthetic: true`, 10개 기능 관측, warmup/measured 원시 sample, reader 원시 probe, 부하별 요약, 경합 결과, Node/OS/CPU/Prisma/SQLite·journal mode, 고정 설정, 측정 시작·종료·구간과 명령 전체 `elapsedMs`를 JSON으로 출력합니다. 로컬 DB 경로·호스트명은 포함하지 않습니다. percentile은 warmup을 제외하고 정렬한 값의 `ceil(p*n)-1` 인덱스를 고르는 nearest-rank 방식입니다. 부하별 수집은 n=3이므로 p95는 최댓값이며, reader 요약은 해당 부하의 measured probe를 합친 값입니다. 원자료와 sampleCount를 함께 해석해야 합니다.

이 측정은 소규모 loopback·임시 SQLite의 관측이지 운영 처리량, freshness SLA, 최대 용량, 장애복구 또는 실제 원천 완전성의 증거가 아닙니다. 성능 수치에 통과 임계값을 두지 않으며 기능·원자성·readback assertion만 필수입니다. 프로세스·전원 강제 종료, 외부 네트워크, 운영 DB·scheduler·스키마·배포는 범위 밖입니다. 공개 시 receipt의 실제 환경과 원자료를 유지하고 합성 관측임을 표시해야 합니다.

노선코드 검색은 다른 검색 경로처럼 DB를 직접 조회합니다. 별도 scheduler 프로세스에서 무효화할 수 없던 웹 프로세스의 1시간 메모리 캐시와 관련 코드는 제거했습니다. 대신 검색 요청마다 DB 조회가 발생하며, 이 합성 검증으로 운영 처리량이나 지연 시간을 주장하지 않습니다.

**해석 범위:** `sync.count`는 신규 행 수가 아니라 처리한 upsert 연산 수입니다. 원천 응답에서 빠진 행은 저장소에 남으므로 완전한 최신 스냅샷과 같지 않습니다. `createdAt`은 최초 저장 시각이지 마지막 수집 성공 시각이 아닙니다. 합성 재현·CI 통과는 실제 원천의 완전성, 운영 최신성 SLA, 운영 서버 배포를 증명하지 않습니다. cron·재시도 정책·DB 스키마·API 응답 형식은 변경하지 않았습니다.

단위 테스트는 Axios의 기본 HTTP 경로를 차단하고 합성 transport만 사용합니다. 실제 네트워크 입출력이 필요한 위 검증은 loopback 서버로 제한합니다. `npm test`에는 Docker Compose 설정 검사가 포함되어 Docker CLI가 필요하며, 테스트 DB를 지정할 때는 운영 DB가 아닌 별도 `DATABASE_URL`을 사용해야 합니다.

## 의존성 보안·호환성 검증

Prisma 6을 유지하면서 `@prisma/config@6.19.3`의 `deepmerge-ts`만 `8.0.2`로 고정합니다. 이 부모 패키지 한정 override는 순환 참조 병합의 stack overflow 취약점([GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx))에 대응하며, 전역 override나 Prisma 7 강제 업그레이드가 아닙니다. 해당 취약점이 이 서비스의 입력 경로에서 악용 가능했다고 주장하지 않습니다. 업스트림이 보장한 조합은 아니므로 Prisma/config 갱신 시 예외를 다시 검토해야 합니다.

`tests/prisma-config.test.ts`는 실제 TypeScript 설정 파일의 로딩, 파일 위치 기준 상대 경로 해석, migration 설정 보존, 설정 파일 부재 처리를 검증합니다. CI는 기능 회귀·합성 수집 검증·`npm audit --audit-level=high`에 더해 Docker의 두 빌드 단계를 실행하고, 최종 이미지에서 임시 SQLite 쿼리를 실행합니다. 감사 대상에는 개발용 의존성도 포함되며, 기존과 같이 High 이상이면 CI가 실패합니다. 따라서 CI 통과만으로 Moderate·Low까지 0건이라고 해석하면 안 됩니다. 컨테이너 검증은 배포·운영 볼륨 연결 없이 수행합니다.

2026-10-24 개발용 의존성 보강에서 Vitest와 `@vitest/mocker`는 4.1.12, Vite는 8.3.5, PostCSS는 8.5.31, NanoID는 3.3.20, `source-map-js`는 1.2.2로 갱신했습니다. Vitest의 선언된 최소 버전도 `^4.1.12`로 올렸습니다. Vitest 5는 Node 20을 지원하지 않아 채택하지 않았으며, 현재 Vite를 Node 20에서 실행하려면 20.19.0 이상이 필요합니다. 운영 의존성 그래프와 Prisma 6 한정 override는 유지했고 새 override는 추가하지 않았습니다.

클린 설치 후 `npm audit --json`과 `npm audit --omit=dev --json`은 모두 0건을 보고했습니다. 이 결과는 해당 시점의 알려진 의존성 취약점 검사 결과이지 전체 애플리케이션의 보안 보장이나 운영 서버 반영 증거가 아닙니다.

## CI 런타임·이미지 빌드

GitHub Actions 자체는 Node 24 기반 `checkout@v7.0.1`, `setup-node@v7.1.0`을 사용합니다. 테스트에서 선택하는 Node 20과 Docker의 `node:20-alpine`은 별개이며 변경하지 않았습니다.

Docker 이미지는 체크아웃된 디렉터리에서 `docker build`로 빌드합니다. registry push나 운영 배포는 하지 않습니다. Buildx의 `gha` 계층 캐시는 [동일 revision 실험](https://github.com/kilhyeonjun/daesin-logistics-bot-be/actions/runs/40056863732)에서 최초·재사용 job이 각각 162초·160초였고, 캐시 export만 65.4초·67.2초를 차지해 채택하지 않았습니다. 비교 기준 main job은 69초였습니다. 이는 해당 runner 실행의 관측값이며 일반적인 캐시 성능을 뜻하지 않습니다.

두 빌드 단계에는 `prisma/schema.prisma`만 복사해 생성된 SQLite 파일을 이미지 입력에서 제외합니다. builder의 Prisma 생성은 `npm run build`에 포함된 한 번만 명시적으로 실행하고, 별도로 의존성을 설치하는 runner 단계의 생성은 유지합니다. 최종 이미지의 코드·의존성은 root 소유로 두고 SQLite 디렉터리 `/app/data`만 비-root 앱 사용자가 소유합니다. 전체 `/app`의 재귀적 소유권 변경과 그에 따른 계층 복사를 피합니다.

기능 테스트와 전체 의존성 감사를 유지하며, 최종 이미지의 기본 비-root 사용자로 `/app/data`에 임시 SQLite 테이블 생성·삽입·조회를 실행합니다. 이 컨테이너에는 운영 볼륨을 연결하지 않습니다. 따라서 이미지 내부 쓰기 권한은 검증하지만 실제 bind mount의 호스트 권한은 별도 운영 확인 대상입니다. 이 CI는 Linux amd64 검증이며, ARM 운영 반영 증거를 대신하지 않습니다.

## 라이선스

ISC
