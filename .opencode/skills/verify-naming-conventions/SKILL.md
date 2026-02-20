---
name: verify-naming-conventions
description: 파일명/클래스/인터페이스/토큰 네이밍 규칙을 검증합니다. 파일 생성/리네임 후 사용.
---

# 네이밍 규칙 검증

## Purpose

1. **파일명 PascalCase** — `src/` 내 TypeScript 파일이 PascalCase 네이밍을 따르는지 검증
2. **인터페이스 I 접두사** — 인터페이스가 `I` 접두사를 사용하는지 검증
3. **UseCase 접미사** — 유스케이스 클래스가 `*UseCase` 접미사를 사용하는지 검증
4. **Dto 접미사** — DTO 인터페이스/클래스가 `*Dto` 접미사를 사용하는지 검증
5. **TOKENS SCREAMING_SNAKE** — DI 토큰이 SCREAMING_SNAKE_CASE 네이밍을 따르는지 검증

## When to Run

- 새 파일을 생성한 후
- 파일이나 클래스 이름을 변경한 후
- 새 DI 토큰을 추가한 후

## Related Files

| File | Purpose |
|------|---------|
| `src/domain/entities/Route.ts` | PascalCase 파일명 예시 |
| `src/domain/repositories/IRouteRepository.ts` | I 접두사 인터페이스 파일 예시 |
| `src/application/use-cases/SearchRoutesByCodeUseCase.ts` | UseCase 접미사 예시 |
| `src/application/dto/RouteDto.ts` | Dto 접미사 예시 |
| `src/config/tokens.ts` | TOKENS 네이밍 예시 (PascalCase 속성명) |
| `src/interface/http/controllers/RouteController.ts` | Controller PascalCase 예시 |
| `src/infrastructure/persistence/PrismaRouteRepository.ts` | Repository PascalCase 예시 |

## Workflow

### Step 1: src/ 파일명 PascalCase 검증

**검사:** `src/` 하위 모든 TypeScript 파일이 PascalCase 또는 허용된 네이밍(예: `index.ts`)을 따르는지 확인합니다.

**도구:** Glob + Bash

```
Glob: src/**/*.ts
```

결과에서 파일명(경로의 마지막 세그먼트)을 추출하고, PascalCase 패턴(`/^[A-Z][a-zA-Z0-9]*\.ts$/`) 또는 허용 목록(`index.ts`)과 대조합니다.

**PASS:** 모든 파일명이 PascalCase이거나 허용 목록에 포함.

**FAIL:** camelCase, kebab-case, snake_case 파일명이 있는 경우 (예: `routeController.ts`, `route-controller.ts`).

**수정:** 파일명을 PascalCase로 변경합니다 (예: `RouteController.ts`).

### Step 2: 인터페이스 I 접두사 검증

**검사:** `src/domain/repositories/`와 `src/domain/ports/` 내 인터페이스 파일이 `I` 접두사를 사용하는지 확인합니다.

**도구:** Glob

```
Glob: src/domain/{repositories,ports}/*.ts
```

파일명이 `I`로 시작하는지 확인합니다.

추가로, 해당 파일 내부의 `export interface` 선언에서 인터페이스 이름이 `I`로 시작하는지 Grep으로 확인합니다.

```
pattern: "export interface (?!I)[A-Z]"
include: "*.ts"
path: "src/domain/repositories"
```

```
pattern: "export interface (?!I)[A-Z]"
include: "*.ts"
path: "src/domain/ports"
```

**PASS:** 모든 리포지토리/포트 인터페이스가 `I` 접두사를 사용.

**FAIL:** `I` 접두사 없는 인터페이스 (예: `RouteRepository` → `IRouteRepository`).

**수정:** 인터페이스 이름과 파일명에 `I` 접두사를 추가합니다.

### Step 3: UseCase 접미사 검증

**검사:** `src/application/use-cases/` 내 파일이 `*UseCase.ts` 접미사를 사용하는지 확인합니다.

**도구:** Glob

```
Glob: src/application/use-cases/*.ts
```

결과에서 테스트 디렉토리(`__tests__/`)를 제외하고, 파일명이 `UseCase.ts`로 끝나는지 확인합니다.

**PASS:** 모든 유스케이스 파일이 `*UseCase.ts` 패턴.

**FAIL:** 접미사가 없는 파일 (예: `SearchRoutes.ts` → `SearchRoutesUseCase.ts`).

**수정:** 파일명과 클래스명에 `UseCase` 접미사를 추가합니다.

### Step 4: Dto 접미사 검증

**검사:** `src/application/dto/` 내 인터페이스/클래스가 `*Dto` 접미사를 사용하는지 확인합니다.

**도구:** Grep

```
pattern: "export (interface|class) [A-Za-z]+(?<!Dto|Mapper)\\b"
include: "*.ts"
path: "src/application/dto"
```

**PASS:** 모든 DTO가 `*Dto` 접미사 사용 (Mapper 클래스는 예외).

**FAIL:** 접미사 없는 DTO (예: `Route` → `RouteDto`).

**수정:** DTO 이름에 `Dto` 접미사를 추가합니다.

### Step 5: TOKENS 네이밍 검증

**검사:** `src/config/tokens.ts`에서 TOKENS 객체의 속성명이 PascalCase인지 확인합니다.

**도구:** Read

파일을 읽고 `TOKENS` 객체의 각 속성 이름이 PascalCase(`/^[A-Z][a-zA-Z0-9]*$/`)를 따르는지 확인합니다.

**PASS:** 모든 토큰 속성이 PascalCase (예: `RouteRepository`, `PrismaClient`).

**FAIL:** camelCase나 다른 케이스의 토큰 (예: `routeRepository`).

**수정:** 토큰 속성명을 PascalCase로 변경합니다.

## Output Format

```markdown
| # | 검사 | 상태 | 위반 항목 |
|---|------|------|-----------|
| 1 | 파일명 PascalCase | PASS/FAIL | 파일 목록 |
| 2 | 인터페이스 I 접두사 | PASS/FAIL | 파일/인터페이스 목록 |
| 3 | UseCase 접미사 | PASS/FAIL | 파일 목록 |
| 4 | Dto 접미사 | PASS/FAIL | 인터페이스/클래스 목록 |
| 5 | TOKENS PascalCase | PASS/FAIL | 속성 목록 |
```

## Exceptions

1. **`index.ts` 파일** — `src/interface/http/routes/index.ts`처럼 라우터 진입점 역할을 하는 index.ts는 PascalCase 예외
2. **`server.ts`, `app.ts`** — 앱 진입점 파일은 PascalCase 예외
3. **Mapper 클래스** — `RouteMapper`처럼 DTO 파일 내의 Mapper 클래스는 `Dto` 접미사 불필요
4. **`environment.ts`** — 환경 설정 파일은 소문자 허용
5. **`kakao.ts`** (`src/shared/types/kakao.ts`) — 타입 정의 파일은 소문자 허용
6. **`__tests__/` 디렉토리 내 파일** — 테스트 파일은 `*.test.ts` 패턴이 허용됨
7. **미들웨어 파일** (`src/shared/middleware/`) — `apiKeyAuth.ts`, `adminAuth.ts`처럼 camelCase 허용
