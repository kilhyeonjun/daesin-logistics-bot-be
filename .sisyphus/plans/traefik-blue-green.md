# Traefik Blue-Green Zero-Downtime Deployment

## TL;DR

> **Quick Summary**: Traefik v3.6을 리버스 프록시로 추가하고, Blue-Green 배포 전략으로 무중단 배포를 구현합니다. 환경변수로 활성 서비스를 전환하고, Tailscale Funnel을 localhost:80으로 변경합니다.
> 
> **Deliverables**:
> - `docker-compose.yml` (Traefik + app-blue + app-green 서비스)
> - `scripts/deploy.sh` (Blue-Green 전환 로직)
> - `README.md` 업데이트 (아키텍처 및 배포 문서)
> 
> **Estimated Effort**: Medium (2-3시간)
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 → Task 2 → Task 4 → Task 5

---

## Context

### Original Request
Traefik Blue-Green 무중단 배포 구현:
1. docker-compose.yml에 Traefik 서비스 추가 (포트 80)
2. app-blue, app-green 서비스로 분리
3. 배포 스크립트 Blue-Green 전환 로직
4. README 업데이트
5. Tailscale Funnel 변경 안내

### Interview Summary
**Key Discussions**:
- Traefik v3.0+ 사용 (v3.6 권장)
- 환경변수 `BLUE_ENABLED`, `GREEN_ENABLED`로 활성 서비스 토글
- SQLite DB는 한 번에 하나의 서비스만 접근 (Blue-Green 특성상 동시 접근 없음)
- TLS/HTTPS는 Tailscale Funnel이 처리 (Traefik에서는 HTTP만)
- Traefik 대시보드는 포트 8080에서 활성화 (디버깅용)

**Research Findings**:
- Traefik v3 라벨 문법: `traefik.enable=${BLUE_ENABLED:-true}`
- 헬스체크: `traefik.http.services.*.loadbalancer.healthcheck.path=/health`
- Priority 기반 라우팅: 값이 높을수록 우선

### Self Gap Analysis
**Identified Gaps** (addressed):
- 첫 배포 시 초기 상태 정의 필요 → Blue가 기본 활성
- Rollback 시나리오 → 환경변수 전환으로 즉시 롤백 가능
- 빌드 캐시 문제 → `--no-cache` 옵션 제공
- 컨테이너 정리 → 이전 버전 컨테이너 자동 정리 로직 추가

---

## Work Objectives

### Core Objective
Traefik을 리버스 프록시로 사용하여 Blue-Green 무중단 배포 환경을 구축합니다.

### Concrete Deliverables
- `docker-compose.yml`: Traefik + app-blue + app-green 서비스 구성
- `scripts/deploy.sh`: Blue-Green 전환 자동화 스크립트
- `README.md`: 새로운 아키텍처 및 배포 방법 문서화

### Definition of Done
- [ ] `docker compose up -d` 후 localhost:80 접근 시 200 OK
- [ ] `BLUE_ENABLED=false GREEN_ENABLED=true docker compose up -d` 실행 시 서비스 전환
- [ ] 전환 중 다운타임 없음 (헬스체크 기반 트래픽 라우팅)
- [ ] `./scripts/deploy.sh` 실행 시 자동 Blue-Green 배포 완료

### Must Have
- Traefik v3.6 리버스 프록시
- 환경변수 기반 서비스 토글 (`BLUE_ENABLED`, `GREEN_ENABLED`)
- 헬스체크 기반 트래픽 라우팅
- 기존 SQLite 볼륨 마운트 유지 (`./data:/app/data`)
- 기존 extra_hosts 설정 유지 (`logistics.ds3211.co.kr`)
- 배포 스크립트의 자동 헬스체크 및 트래픽 전환

### Must NOT Have (Guardrails)
- 호스트 포트 바인딩 (app 서비스): Traefik 통해서만 접근
- TLS 인증서 관리 (Tailscale Funnel이 처리)
- 복잡한 카나리 배포 (단순 Blue-Green만)
- 애플리케이션 코드 변경
- Dockerfile 변경
- 데이터베이스 스키마 변경

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: NO (테스트 인프라 없음, Docker 환경 검증으로 대체)
- **User wants tests**: Manual-only (자동화된 배포 스크립트에 검증 포함)
- **Framework**: Shell script verification (curl)

### If Automated Verification Only (NO User Intervention)

Each TODO includes EXECUTABLE verification procedures that agents can run directly:

**By Deliverable Type:**

| Type | Verification Tool | Automated Procedure |
|------|------------------|---------------------|
| **Docker Compose** | Bash (docker, curl) | Agent starts containers, checks status, verifies HTTP response |
| **Deploy Script** | Bash | Agent runs script, monitors logs, validates transitions |
| **Documentation** | Read tool | Agent reads file, verifies sections exist |

**Evidence Requirements (Agent-Executable):**
- Docker container status output (`docker compose ps`)
- HTTP response codes and body (`curl -v`)
- Script exit codes

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: docker-compose.yml 수정
└── Task 3: README.md 업데이트

Wave 2 (After Task 1):
├── Task 2: deploy.sh 수정 [depends: 1]
└── Task 4: 로컬 테스트 [depends: 1]

Wave 3 (After Wave 2):
└── Task 5: 최종 검증 [depends: 2, 4]

Critical Path: Task 1 → Task 2 → Task 5
Parallel Speedup: ~30% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 4 | 3 |
| 2 | 1 | 5 | 4 |
| 3 | None | None | 1, 4 |
| 4 | 1 | 5 | 2, 3 |
| 5 | 2, 4 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 3 | delegate_task(category="quick", load_skills=[], run_in_background=true) |
| 2 | 2, 4 | dispatch parallel after Wave 1 completes |
| 3 | 5 | final verification task |

---

## TODOs

- [ ] 1. docker-compose.yml 수정 - Traefik Blue-Green 구성

  **What to do**:
  - Traefik v3.6 서비스 추가 (포트 80, 대시보드 8080)
  - 기존 `app` 서비스를 `app-blue`, `app-green`으로 분리
  - 호스트 포트 바인딩 제거 (내부 네트워크만 사용)
  - Traefik 라벨로 라우팅 설정
  - 환경변수 기반 서비스 활성화 (`${BLUE_ENABLED:-true}`, `${GREEN_ENABLED:-false}`)
  - 헬스체크 라벨 추가

  **Must NOT do**:
  - TLS/HTTPS 설정 추가 (Tailscale이 처리)
  - 복잡한 미들웨어 설정
  - 외부 네트워크 정의 (기본 네트워크 사용)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: YAML 파일 수정, 복잡한 로직 없음
  - **Skills**: `[]`
    - No special skills needed: Docker Compose YAML 작성은 기본 역량

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 3)
  - **Blocks**: Tasks 2, 4
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References** (existing code to follow):
  - `docker-compose.yml:1-22` - 현재 서비스 구성 (environment, volumes, extra_hosts, healthcheck)
  
  **External References** (libraries and frameworks):
  - Traefik v3 Docker Provider: https://doc.traefik.io/traefik/providers/docker/
  - Traefik v3 Labels Reference: `traefik.http.routers.*.rule`, `traefik.http.services.*.loadbalancer.healthcheck.*`

  **WHY Each Reference Matters**:
  - 현재 docker-compose.yml의 environment, volumes, extra_hosts 설정을 app-blue/app-green 모두에 복사해야 함
  - Traefik v3 라벨 문법은 v2와 다르므로 공식 문서 참조 필수

  **Acceptance Criteria**:

  **Automated Verification (using Bash curl):**
  ```bash
  # Agent runs:
  docker compose config --services
  # Assert: Output contains "traefik", "app-blue", "app-green"

  # Start services with default (blue enabled)
  docker compose up -d
  # Wait 15s for startup

  docker compose ps --format json | jq -r '.[].State'
  # Assert: All states are "running" or "healthy"

  curl -s http://localhost:80/health
  # Assert: Returns JSON with "status": "ok"

  # Verify Traefik dashboard accessible
  curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/dashboard/
  # Assert: Returns 200 or 302
  ```

  **Evidence to Capture:**
  - [ ] `docker compose config --services` output
  - [ ] `docker compose ps` showing all services running
  - [ ] `curl localhost:80/health` response body

  **Commit**: NO (groups with Task 2)

---

- [ ] 2. scripts/deploy.sh 수정 - Blue-Green 전환 로직

  **What to do**:
  - 현재 활성 서비스 감지 (blue 또는 green)
  - 새 이미지 빌드
  - 비활성 서비스 시작 및 헬스체크 대기
  - 헬스체크 성공 시 트래픽 전환 (환경변수 토글)
  - 이전 활성 서비스 중지 및 정리
  - 롤백 명령어 안내 출력

  **Must NOT do**:
  - 복잡한 카나리 배포 로직
  - 외부 서비스 의존성 추가
  - 자동 롤백 (수동 롤백 안내만)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Bash 스크립트 수정, 단순 로직
  - **Skills**: `[]`
    - No special skills needed: 쉘 스크립트 작성은 기본 역량

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential after Task 1)
  - **Blocks**: Task 5
  - **Blocked By**: Task 1 (docker-compose.yml 필요)

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References** (existing code to follow):
  - `scripts/deploy.sh:1-37` - 현재 배포 스크립트 구조 (git pull, build, restart, healthcheck wait)

  **External References**:
  - Docker Compose CLI: `docker compose up -d`, `docker compose ps`, `docker compose stop`

  **WHY Each Reference Matters**:
  - 기존 스크립트의 구조(에러 핸들링, 로깅 스타일)를 유지해야 함
  - `set -euo pipefail` 패턴 유지

  **Acceptance Criteria**:

  **Automated Verification (using Bash):**
  ```bash
  # Agent runs:
  # Ensure script is executable
  chmod +x scripts/deploy.sh

  # Dry-run syntax check
  bash -n scripts/deploy.sh
  # Assert: Exit code 0

  # Check script contains key functions
  grep -q "BLUE_ENABLED" scripts/deploy.sh
  # Assert: Exit code 0

  grep -q "GREEN_ENABLED" scripts/deploy.sh
  # Assert: Exit code 0

  grep -q "health" scripts/deploy.sh
  # Assert: Exit code 0
  ```

  **Evidence to Capture:**
  - [ ] `bash -n scripts/deploy.sh` exit code 0
  - [ ] Script contains Blue-Green switching logic

  **Commit**: YES
  - Message: `feat(deploy): implement Traefik Blue-Green zero-downtime deployment`
  - Files: `docker-compose.yml`, `scripts/deploy.sh`
  - Pre-commit: `docker compose config` (validate YAML)

---

- [ ] 3. README.md 업데이트 - 아키텍처 및 배포 문서

  **What to do**:
  - "Docker 운영" 섹션에 Traefik Blue-Green 아키텍처 다이어그램 추가
  - 새로운 배포 명령어 문서화 (`./scripts/deploy.sh`)
  - 수동 Blue-Green 전환 방법 설명
  - 롤백 방법 설명
  - Tailscale Funnel 포트 변경 안내 (3000 → 80)
  - 기존 "Zero-Downtime Deployment" 섹션 업데이트

  **Must NOT do**:
  - 불필요한 섹션 추가
  - 기존 API 문서 수정
  - 이모지 과다 사용

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: 마크다운 문서 작성
  - **Skills**: `[]`
    - No special skills needed: 기술 문서 작성은 기본 역량

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: None
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References** (existing code to follow):
  - `README.md:237-292` - 현재 "Docker 운영" 섹션 구조 및 스타일

  **WHY Each Reference Matters**:
  - 기존 README의 마크다운 스타일(헤딩, 코드블록, 테이블)을 일관되게 유지해야 함

  **Acceptance Criteria**:

  **Automated Verification (using Read tool):**
  ```
  # Agent reads README.md and verifies:
  # 1. "Traefik" 또는 "Blue-Green" 문자열 존재
  # 2. "localhost:80" 또는 "포트 80" 문자열 존재
  # 3. "BLUE_ENABLED" 또는 "GREEN_ENABLED" 문자열 존재
  # 4. "Tailscale" 섹션에 포트 변경 안내 존재
  ```

  **Evidence to Capture:**
  - [ ] README.md에 Traefik 아키텍처 설명 존재
  - [ ] Tailscale Funnel 포트 변경 안내 존재

  **Commit**: YES
  - Message: `docs: add Traefik Blue-Green deployment architecture`
  - Files: `README.md`
  - Pre-commit: None

---

- [ ] 4. 로컬 환경 테스트 - Blue-Green 전환 검증

  **What to do**:
  - Docker Compose로 전체 스택 시작 (Blue 활성)
  - 헬스체크 및 API 응답 확인
  - Green으로 전환 테스트
  - 롤백 (Blue로 복귀) 테스트
  - Traefik 대시보드 접근 확인
  - 전환 중 다운타임 측정

  **Must NOT do**:
  - 프로덕션 환경 배포
  - 실제 데이터 수정

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Docker 명령 실행 및 검증
  - **Skills**: `[]`
    - No special skills needed: 터미널 명령 실행은 기본 역량

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (after Task 1)
  - **Blocks**: Task 5
  - **Blocked By**: Task 1 (docker-compose.yml 필요)

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References**:
  - Task 1 Acceptance Criteria - Docker Compose 검증 명령어

  **Acceptance Criteria**:

  **Automated Verification (using Bash):**
  ```bash
  # 1. Start with Blue active (default)
  BLUE_ENABLED=true GREEN_ENABLED=false docker compose up -d
  sleep 15

  # 2. Verify Blue is serving traffic
  curl -s http://localhost:80/health | jq -r '.status'
  # Assert: Returns "ok"

  # 3. Switch to Green
  BLUE_ENABLED=false GREEN_ENABLED=true docker compose up -d
  sleep 10

  # 4. Verify Green is serving traffic (no downtime)
  curl -s http://localhost:80/health | jq -r '.status'
  # Assert: Returns "ok"

  # 5. Rollback to Blue
  BLUE_ENABLED=true GREEN_ENABLED=false docker compose up -d
  sleep 10

  # 6. Verify Blue is back
  curl -s http://localhost:80/health | jq -r '.status'
  # Assert: Returns "ok"

  # 7. Cleanup
  docker compose down
  ```

  **Evidence to Capture:**
  - [ ] Blue → Green 전환 성공 로그
  - [ ] Green → Blue 롤백 성공 로그
  - [ ] 각 단계 curl 응답

  **Commit**: NO (테스트만, 커밋 대상 없음)

---

- [ ] 5. 최종 검증 및 정리

  **What to do**:
  - 모든 변경사항 최종 검토
  - 배포 스크립트 전체 실행 테스트
  - 불필요한 컨테이너/이미지 정리
  - Tailscale Funnel 변경 명령어 제공

  **Must NOT do**:
  - 실제 Tailscale Funnel 변경 (사용자가 수동으로 해야 함)
  - 원격 서버 배포

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 최종 검증 및 정리
  - **Skills**: `[]`
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (final)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 2, 4

  **References**:
  - Tasks 1-4의 모든 결과물

  **Acceptance Criteria**:

  **Automated Verification (using Bash):**
  ```bash
  # Full deploy script test
  ./scripts/deploy.sh
  # Assert: Exit code 0

  # Final health check
  curl -s http://localhost:80/health | jq -r '.status'
  # Assert: Returns "ok"

  # Cleanup
  docker compose down
  docker system prune -f
  ```

  **Evidence to Capture:**
  - [ ] `./scripts/deploy.sh` 전체 실행 로그
  - [ ] 최종 헬스체크 성공

  **Commit**: NO (이미 Task 2, 3에서 커밋 완료)

  **User Action Required After Completion**:
  ```bash
  # Tailscale Funnel 포트 변경 (사용자가 직접 실행)
  tailscale funnel --bg localhost:80
  
  # 기존 포트 3000 funnel 제거
  tailscale funnel off localhost:3000
  ```

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 2 | `feat(deploy): implement Traefik Blue-Green zero-downtime deployment` | docker-compose.yml, scripts/deploy.sh | docker compose config |
| 3 | `docs: add Traefik Blue-Green deployment architecture` | README.md | - |

---

## Success Criteria

### Verification Commands
```bash
# 1. 서비스 상태 확인
docker compose ps
# Expected: traefik, app-blue (or app-green) running

# 2. 헬스체크
curl -s http://localhost:80/health
# Expected: {"status": "ok", ...}

# 3. Traefik 대시보드
curl -s http://localhost:8080/api/http/services
# Expected: JSON with service definitions

# 4. Blue-Green 전환
BLUE_ENABLED=false GREEN_ENABLED=true docker compose up -d
curl -s http://localhost:80/health
# Expected: {"status": "ok", ...} (no downtime)
```

### Final Checklist
- [ ] Traefik v3.6 리버스 프록시 동작
- [ ] Blue-Green 환경변수 전환 동작
- [ ] 헬스체크 기반 트래픽 라우팅
- [ ] 배포 스크립트 자동화 완료
- [ ] README 문서화 완료
- [ ] 호스트 포트 바인딩 없음 (Traefik 80 제외)
- [ ] Tailscale Funnel 변경 안내 포함
