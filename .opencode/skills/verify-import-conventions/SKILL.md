---
name: verify-import-conventions
description: ESM import 규칙을 검증합니다. .js 확장자, reflect-metadata 순서, type import 사용을 확인합니다. 파일 추가/수정 후 사용.
---

# Import 규칙 검증

## Purpose

1. **ESM .js 확장자** — 모든 상대 경로 import에 `.js` 확장자가 포함되어 있는지 검증
2. **reflect-metadata 순서** — DI를 사용하는 파일에서 `reflect-metadata`가 첫 번째 import인지 검증
3. **type import 사용** — 인터페이스/타입을 import할 때 `import type` 구문을 사용하는지 검증

## When to Run

- TypeScript 파일을 새로 생성하거나 수정한 후
- import 구문을 변경한 후
- DI 데코레이터를 사용하는 파일을 추가한 후

## Related Files

| File | Purpose |
|------|---------|
| `src/config/container.ts` | reflect-metadata 첫 번째 import 예시 |
| `src/application/use-cases/SearchRoutesByCodeUseCase.ts` | 올바른 .js 확장자 import 예시 |
| `src/infrastructure/persistence/PrismaRouteRepository.ts` | type import 사용 예시 |
| `src/interface/http/controllers/RouteController.ts` | 올바른 import 순서 예시 |
| `src/domain/value-objects/LineCode.ts` | 도메인 내부 import 예시 |
| `src/domain/repositories/IRouteRepository.ts` | type import 대상 파일 |
| `src/domain/ports/ICrawler.ts` | type import 대상 파일 |
| `src/domain/ports/ICacheService.ts` | type import 대상 파일 |
| `tsconfig.json` | module: NodeNext 설정 (ESM 요구) |
| `package.json` | "type": "module" 설정 |

## Workflow

### Step 1: 상대 경로 import에 .js 확장자 확인

**검사:** `src/` 내 모든 TypeScript 파일에서 상대 경로 import(`./` 또는 `../`)에 `.js` 확장자가 빠진 것이 없는지 확인합니다.

**도구:** Grep

```
pattern: "from '\\.\\.?/[^']*(?<!\\.js)'"
include: "*.ts"
path: "src"
```

**PASS:** `.js` 확장자가 빠진 상대 경로 import가 없음.

**FAIL:** 상대 경로 import에 `.js` 확장자가 없는 경우 (예: `from './tokens'` → `from './tokens.js'`).

**수정:** 모든 상대 경로 import에 `.js` 확장자를 추가합니다.

### Step 2: reflect-metadata 첫 번째 import 확인

**검사:** `reflect-metadata`를 import하는 파일에서 해당 import가 파일의 첫 번째 import인지 확인합니다.

**도구:** Grep

```
pattern: "import 'reflect-metadata'"
include: "*.ts"
path: "src"
```

각 매칭된 파일에 대해 Read로 첫 줄을 확인하여 `import 'reflect-metadata'`가 첫 번째 import인지 검증합니다.

**PASS:** `reflect-metadata`를 import하는 파일에서 해당 라인이 첫 번째 import임.

**FAIL:** `reflect-metadata` import 전에 다른 import가 존재하는 경우.

**수정:** `import 'reflect-metadata'`를 파일의 첫 번째 import로 이동합니다.

### Step 3: 인터페이스/타입에 type import 사용 확인

**검사:** `I`로 시작하는 인터페이스나 타입 전용 심볼을 import할 때 `import type` 구문을 사용하는지 확인합니다.

**도구:** Grep

```
pattern: "^import \\{ .*I[A-Z][a-zA-Z]+"
include: "*.ts"
path: "src"
```

매칭된 결과에서 `import type`이 아닌 `import`로 인터페이스를 가져오는 경우를 식별합니다.

**PASS:** 인터페이스 import에 `import type` 사용.

**FAIL:** 인터페이스를 일반 `import { IFoo }` 구문으로 가져오는 경우. `import type { IFoo }`를 사용해야 함.

**수정:** `import { IFoo }` → `import type { IFoo }`로 변경합니다.

**주의:** `container.ts`에서 `import type`은 타입 전용이므로, `container.register<IFoo>()` 제네릭에서만 사용하고 런타임 바인딩에는 `import`를 사용합니다.

## Output Format

```markdown
| # | 검사 | 상태 | 위반 파일 |
|---|------|------|-----------|
| 1 | 상대 경로 .js 확장자 | PASS/FAIL | 파일:라인 목록 |
| 2 | reflect-metadata 첫 번째 import | PASS/FAIL | 파일 목록 |
| 3 | type import 사용 | PASS/FAIL | 파일:라인 목록 |
```

## Exceptions

1. **외부 패키지 import** — `from 'express'`, `from 'tsyringe'` 등 npm 패키지는 `.js` 확장자 불필요
2. **`container.ts`의 타입 import** — DI 컨테이너 파일에서 `register<IFoo>()` 제네릭 파라미터 용도로 `import type`을 사용하되, 런타임에 필요한 클래스는 일반 `import`을 사용
3. **`@prisma/client` import** — Prisma가 생성한 타입은 런타임에도 사용되므로 `import type`이 아닌 일반 `import` 허용
