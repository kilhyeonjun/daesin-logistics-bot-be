---
name: verify-clean-architecture
description: Clean Architecture 레이어 의존성 규칙을 검증합니다. 도메인/애플리케이션/인프라/인터페이스 레이어 변경 후 사용.
---

# Clean Architecture 레이어 의존성 검증

## Purpose

1. **도메인 레이어 순수성** — `src/domain/` 내 파일이 외부 패키지나 상위 레이어를 import하지 않는지 검증
2. **애플리케이션 레이어 규칙** — `src/application/` 내 파일이 domain과 config만 import하는지 검증
3. **인프라스트럭처 방향성** — `src/infrastructure/` 내 파일이 domain 인터페이스를 implements하고, interface 레이어를 import하지 않는지 검증
4. **인터페이스 레이어 규칙** — `src/interface/` 내 파일이 infrastructure를 직접 import하지 않는지 검증

## When to Run

- `src/domain/`, `src/application/`, `src/infrastructure/`, `src/interface/` 하위 파일을 수정한 후
- 새 모듈이나 레이어 간 의존성을 추가한 후
- import 구조를 리팩터링한 후

## Related Files

| File | Purpose |
|------|---------|
| `src/domain/entities/Route.ts` | 도메인 엔티티 (외부 의존성 없어야 함) |
| `src/domain/entities/Admin.ts` | 도메인 엔티티 |
| `src/domain/entities/MigrationJob.ts` | 도메인 엔티티 |
| `src/domain/repositories/IRouteRepository.ts` | 도메인 리포지토리 인터페이스 |
| `src/domain/repositories/IAdminRepository.ts` | 도메인 리포지토리 인터페이스 |
| `src/domain/repositories/IMigrationJobRepository.ts` | 도메인 리포지토리 인터페이스 |
| `src/domain/ports/ICrawler.ts` | 도메인 포트 인터페이스 |
| `src/domain/ports/ICacheService.ts` | 도메인 포트 인터페이스 |
| `src/domain/value-objects/LineCode.ts` | 값 객체 |
| `src/domain/value-objects/SearchDate.ts` | 값 객체 |
| `src/domain/value-objects/YearMonth.ts` | 값 객체 |
| `src/application/use-cases/SearchRoutesByCodeUseCase.ts` | 유스케이스 (domain + config만 의존) |
| `src/infrastructure/persistence/PrismaRouteRepository.ts` | 인프라 구현체 (domain 인터페이스 구현) |
| `src/interface/http/controllers/RouteController.ts` | 인터페이스 레이어 (infrastructure 직접 의존 금지) |

## Workflow

### Step 1: 도메인 레이어 순수성 검증

**검사:** `src/domain/` 내 파일이 외부 패키지(`node_modules`)를 import하지 않는지 확인합니다. 도메인 레이어는 오직 같은 도메인 내부 파일과 `src/shared/` 만 import할 수 있습니다.

**도구:** Grep

```
pattern: "from '(?!\\.\\.?/|\\.\\.?\\\\)"
include: "*.ts"
path: "src/domain"
```

**PASS:** `src/domain/` 파일에서 외부 패키지 import가 없음. `../../shared/` 경로의 import는 허용.

**FAIL:** `src/domain/` 파일에서 외부 패키지(예: `prisma`, `express`, `tsyringe`, `axios`, `cheerio`)를 import하는 경우.

**수정:** 도메인 파일에서 외부 의존성을 제거하고, 필요시 인터페이스/포트를 정의하여 인프라에서 구현.

### Step 2: 도메인이 상위 레이어를 import하지 않는지 검증

**검사:** `src/domain/` 내 파일이 `application/`, `infrastructure/`, `interface/`, `config/` 레이어를 import하지 않는지 확인합니다.

**도구:** Grep

```
pattern: "from '.*(application|infrastructure|interface|config)/"
include: "*.ts"
path: "src/domain"
```

**PASS:** 매칭 결과 0건.

**FAIL:** 도메인 파일이 상위 레이어를 import하는 경우.

**수정:** 도메인에서 상위 레이어 의존을 제거. 필요한 인터페이스는 `src/domain/ports/` 또는 `src/domain/repositories/`에 정의.

### Step 3: 애플리케이션 레이어 의존성 검증

**검사:** `src/application/` 내 파일이 `infrastructure/` 또는 `interface/` 레이어를 직접 import하지 않는지 확인합니다. `domain/`과 `config/`만 허용됩니다.

**도구:** Grep

```
pattern: "from '.*(infrastructure|interface)/"
include: "*.ts"
path: "src/application"
```

**PASS:** 매칭 결과 0건.

**FAIL:** 애플리케이션 파일이 infrastructure나 interface를 직접 import하는 경우.

**수정:** DI를 통해 인프라 구현체를 주입받도록 변경. 도메인 인터페이스에 의존하고 구체 구현체를 직접 import하지 않음.

### Step 4: 인터페이스 레이어가 인프라를 직접 import하지 않는지 검증

**검사:** `src/interface/` 내 파일이 `infrastructure/`를 직접 import하지 않는지 확인합니다.

**도구:** Grep

```
pattern: "from '.*infrastructure/"
include: "*.ts"
path: "src/interface"
```

**PASS:** 매칭 결과 0건.

**FAIL:** 인터페이스 파일이 infrastructure를 직접 import하는 경우.

**수정:** DI 컨테이너를 통해 의존성을 주입받도록 변경.

## Output Format

```markdown
| # | 검사 | 상태 | 위반 파일 |
|---|------|------|-----------|
| 1 | 도메인 외부 패키지 import 금지 | PASS/FAIL | 파일 목록 |
| 2 | 도메인 상위 레이어 import 금지 | PASS/FAIL | 파일 목록 |
| 3 | 애플리케이션 infra/interface import 금지 | PASS/FAIL | 파일 목록 |
| 4 | 인터페이스 infrastructure import 금지 | PASS/FAIL | 파일 목록 |
```

## Exceptions

1. **`src/domain/value-objects/`에서 `src/shared/errors/DomainError.ts` import** — 공유 에러 클래스는 도메인 일부로 간주하여 허용
2. **테스트 파일 (`__tests__/`, `*.test.ts`)** — 테스트 파일은 레이어 규칙에서 면제 (테스트 설정을 위해 다양한 레이어를 import할 수 있음)
3. **`src/config/` 디렉토리** — 설정 파일은 모든 레이어를 연결하는 역할이므로 cross-layer import가 허용됨
