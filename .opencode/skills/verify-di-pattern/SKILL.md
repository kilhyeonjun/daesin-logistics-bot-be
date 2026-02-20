---
name: verify-di-pattern
description: TSyringe DI 패턴을 검증합니다. @injectable/@inject 데코레이터, TOKENS 등록, container 동기화를 확인합니다. DI 관련 파일 변경 후 사용.
---

# DI 패턴 검증

## Purpose

1. **@injectable 데코레이터** — DI 컨테이너로 관리되는 클래스에 `@injectable()` 데코레이터가 있는지 검증
2. **@inject 토큰 사용** — 생성자에서 `@inject(TOKENS.*)` 패턴으로 의존성을 주입받는지 검증
3. **TOKENS 등록 동기화** — `tokens.ts`에 정의된 토큰이 `container.ts`에서 등록되어 있는지 검증
4. **인터페이스-구현체 바인딩** — 도메인 인터페이스가 인프라 구현체와 올바르게 바인딩되어 있는지 검증

## When to Run

- 새 유스케이스, 리포지토리, 서비스를 추가한 후
- `src/config/tokens.ts` 또는 `src/config/container.ts`를 수정한 후
- DI 관련 데코레이터를 사용하는 클래스를 추가/수정한 후

## Related Files

| File | Purpose |
|------|---------|
| `src/config/tokens.ts` | 모든 DI 토큰 정의 |
| `src/config/container.ts` | DI 컨테이너에 구현체 등록 |
| `src/application/use-cases/SearchRoutesByCodeUseCase.ts` | @injectable + @inject 패턴 예시 |
| `src/application/use-cases/SearchRoutesByNameUseCase.ts` | @injectable + @inject 패턴 예시 |
| `src/application/use-cases/SearchRoutesByCarUseCase.ts` | @injectable + @inject 패턴 예시 |
| `src/application/use-cases/SyncRoutesUseCase.ts` | @injectable + @inject 패턴 예시 |
| `src/application/use-cases/GetStatsUseCase.ts` | @injectable + @inject 패턴 예시 |
| `src/application/use-cases/GetMonthlyStatsUseCase.ts` | @injectable + @inject 패턴 예시 |
| `src/application/use-cases/MigrationUseCase.ts` | @injectable + @inject 패턴 예시 |
| `src/application/use-cases/LoginUseCase.ts` | @injectable + @inject 패턴 예시 |
| `src/infrastructure/persistence/PrismaRouteRepository.ts` | @injectable 인프라 구현체 |
| `src/infrastructure/persistence/PrismaMigrationJobRepository.ts` | @injectable 인프라 구현체 |
| `src/infrastructure/persistence/PrismaAdminRepository.ts` | @injectable 인프라 구현체 |
| `src/infrastructure/crawling/CheerioHttpCrawler.ts` | @injectable 인프라 구현체 |
| `src/infrastructure/cache/InMemoryCacheService.ts` | @injectable 인프라 구현체 |
| `src/infrastructure/auth/JwtService.ts` | @injectable 인프라 서비스 |
| `src/infrastructure/auth/PasswordService.ts` | @injectable 인프라 서비스 |
| `src/interface/http/controllers/RouteController.ts` | @injectable 컨트롤러 |
| `src/interface/http/controllers/SyncController.ts` | @injectable 컨트롤러 |
| `src/interface/http/controllers/AuthController.ts` | @injectable 컨트롤러 |
| `src/interface/kakao/KakaoSkillController.ts` | @injectable 컨트롤러 |

## Workflow

### Step 1: @injectable 데코레이터 존재 확인

**검사:** DI로 관리되는 클래스(`use-cases/`, `persistence/`, `crawling/`, `cache/`, `auth/`, `controllers/`)에 `@injectable()` 데코레이터가 있는지 확인합니다.

**도구:** Grep (2단계)

먼저 DI 대상 클래스 파일을 찾습니다:

```
Glob: src/{application/use-cases,infrastructure/**,interface/**/controllers}/*.ts
```

`__tests__` 디렉토리를 제외합니다.

각 파일에서 `export class`가 있는지 확인하고, 해당 클래스 위에 `@injectable()` 데코레이터가 있는지 검증합니다:

```
pattern: "@injectable\\(\\)"
include: "*.ts"
path: "src/application/use-cases"
```

```
pattern: "@injectable\\(\\)"
include: "*.ts"
path: "src/infrastructure"
```

```
pattern: "@injectable\\(\\)"
include: "*.ts"
path: "src/interface"
```

**PASS:** 모든 DI 대상 클래스에 `@injectable()` 데코레이터가 있음.

**FAIL:** `@injectable()` 데코레이터가 없는 DI 대상 클래스가 있는 경우.

**수정:** 클래스 위에 `@injectable()` 데코레이터와 `import { injectable } from 'tsyringe'`를 추가합니다.

### Step 2: TOKENS 정의와 container 등록 동기화 확인

**검사:** `src/config/tokens.ts`의 `TOKENS` 객체에 정의된 모든 토큰이 `src/config/container.ts`의 `configureContainer()` 함수에서 등록되어 있는지 확인합니다.

**도구:** Read

1. `src/config/tokens.ts`를 읽어 모든 토큰 키를 추출합니다 (예: `RouteRepository`, `Crawler`, etc.)
2. `src/config/container.ts`를 읽어 `container.register(TOKENS.*)` 호출에서 등록된 토큰을 추출합니다
3. tokens.ts에 있지만 container.ts에서 등록되지 않은 토큰을 식별합니다

**PASS:** 모든 토큰이 등록됨.

**FAIL:** 토큰이 정의되었지만 container에서 등록되지 않은 경우.

**수정:** `container.ts`의 `configureContainer()`에 누락된 토큰의 등록 코드를 추가합니다.

### Step 3: @inject 토큰 사용 검증

**검사:** `@inject()` 데코레이터에서 올바른 TOKENS 참조를 사용하는지 확인합니다.

**도구:** Grep

```
pattern: "@inject\\("
include: "*.ts"
path: "src"
```

각 매칭에서 `@inject(TOKENS.*)`나 `@inject(ClassName)` 패턴을 확인합니다. 문자열 리터럴이나 하드코딩된 심볼을 사용하는 경우는 위반입니다.

**PASS:** 모든 `@inject()`가 `TOKENS.*` 또는 등록된 클래스를 참조.

**FAIL:** 하드코딩된 문자열이나 Symbol을 직접 사용하는 경우.

**수정:** `@inject(TOKENS.SomeDependency)` 패턴으로 변경합니다.

## Output Format

```markdown
| # | 검사 | 상태 | 상세 |
|---|------|------|------|
| 1 | @injectable 데코레이터 | PASS/FAIL | 누락 클래스 목록 |
| 2 | TOKENS-container 동기화 | PASS/FAIL | 미등록 토큰 목록 |
| 3 | @inject 토큰 사용 | PASS/FAIL | 위반 위치 목록 |
```

## Exceptions

1. **`MigrationController`** — `new MigrationController()`로 직접 생성하는 패턴이 현재 사용 중. DI가 아닌 직접 인스턴스화가 의도적인 경우
2. **유스케이스의 자기 등록** — `container.register(SearchRoutesByCodeUseCase, { useClass: SearchRoutesByCodeUseCase })` 패턴에서 TOKENS 대신 클래스 자체를 토큰으로 사용하는 것은 허용
3. **테스트 파일** — `__tests__/` 내 파일이나 `tests/` 디렉토리의 파일은 DI 패턴 검증 대상에서 면제
