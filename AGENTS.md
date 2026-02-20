# AGENTS.md

Guidelines for AI coding agents working in this repository.

## Quick Reference

### Build & Test Commands

```bash
npm run build          # Prisma generate + TypeScript compile
npm run dev            # Development server with hot reload
npm start              # Production server (requires build)
npm test               # Run all tests
npm run test:watch     # Watch mode for tests

# Run a single test file
npx vitest run tests/api.test.ts

# Run specific test by name
npx vitest run -t "헬스체크"

# Run tests matching pattern
npx vitest run tests/database
```

### Database Commands

```bash
npx prisma db push     # Apply schema changes
npx prisma generate    # Regenerate client
npm run sync           # Manual data sync from crawler
```

---

## Architecture: Clean Architecture + TSyringe DI

```
src/
├── domain/           # Core business logic (NO external deps)
│   ├── entities/     # Route entity
│   ├── repositories/ # IRouteRepository interface
│   ├── ports/        # ICrawler interface
│   └── value-objects/# LineCode, SearchDate
├── application/      # Use Cases
│   ├── use-cases/    # Single-responsibility operations
│   └── dto/          # Data transfer objects
├── infrastructure/   # External implementations
│   ├── persistence/  # PrismaRouteRepository
│   └── crawling/     # CheerioHttpCrawler
├── interface/        # Entry points
│   ├── http/         # REST controllers
│   └── kakao/        # Kakao chatbot
└── config/           # DI container + tokens
```

### Dependency Flow

```
interface → application → domain ← infrastructure
```

- Domain layer has ZERO external dependencies
- Application layer only depends on domain interfaces
- Infrastructure implements domain interfaces
- Interface layer resolves use cases from DI container

---

## Code Style Guidelines

### Import Order

1. `reflect-metadata` (MUST be first when using DI)
2. External packages (tsyringe, express, prisma, etc.)
3. Internal: config → domain → application → infrastructure → interface
4. Types prefixed with `type` keyword

```typescript
import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import type { IRouteRepository } from '../../domain/repositories/IRouteRepository.js';
import { Route } from '../../domain/entities/Route.js';
import { TOKENS } from '../../config/tokens.js';
```

### File Extensions

Always use `.js` extension in imports (ESM requirement):

```typescript
// CORRECT
import { TOKENS } from './tokens.js';

// WRONG
import { TOKENS } from './tokens';
```

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files | PascalCase | `RouteController.ts`, `IRouteRepository.ts` |
| Interfaces | `I` prefix | `IRouteRepository`, `ICrawler` |
| Classes | PascalCase | `PrismaRouteRepository`, `Route` |
| Use Cases | `*UseCase` suffix | `SearchRoutesByCodeUseCase` |
| DTOs | `*Dto` suffix | `RouteDto`, `StatsDto` |
| Tokens | SCREAMING_SNAKE | `TOKENS.RouteRepository` |
| Variables | camelCase | `routeRepository`, `searchDate` |

### Dependency Injection Pattern

```typescript
import { injectable, inject } from 'tsyringe';
import { TOKENS } from '../../config/tokens.js';

@injectable()
export class SomeUseCase {
  constructor(
    @inject(TOKENS.RouteRepository)
    private readonly routeRepository: IRouteRepository
  ) {}
}
```

### Error Handling

Use domain-specific error classes from `src/shared/errors/DomainError.ts`:

```typescript
import { ValidationError, NotFoundError, CrawlingError } from '../../shared/errors/DomainError.js';

// Validation
if (!/^\d{6}$/.test(code)) {
  throw new ValidationError('LineCode must be exactly 6 digits');
}

// Not found
throw new NotFoundError('Route', lineCode);

// External service failures
throw new CrawlingError('Failed to fetch data');
```

Controller error handling pattern:

```typescript
try {
  const result = await this.useCase.execute(input);
  res.json(result);
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  res.status(500).json({ success: false, error: message });
}
```

### TypeScript Strictness

- `strict: true` is enabled
- Use explicit types for function parameters and return values
- Use `type` imports for interfaces: `import type { IRouteRepository } from ...`
- Nullability: use `T | null` (not `undefined`) for optional domain properties
- Default values: handle nulls with `?? 0` or `?? undefined`

### Entity Pattern

```typescript
export interface RouteProps {
  id?: number;
  searchDate: string;
  // ... other props
}

export class Route {
  readonly searchDate: string;
  // ... readonly properties

  constructor(props: RouteProps) {
    this.searchDate = props.searchDate;
    // ... assign all props
  }

  static create(props: Omit<RouteProps, 'id' | 'createdAt'>): Route {
    return new Route({ ...props });
  }
}
```

### Value Object Pattern

```typescript
export class LineCode {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(code: string): LineCode {
    // Validate and create
  }

  getValue(): string {
    return this.value;
  }
}
```

---

## Testing Guidelines

### Test Setup

Tests require `reflect-metadata` imported BEFORE container configuration. This is handled in `tests/setup.ts`.

### Test Structure

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { container } from '../src/config/container.js';
import { TOKENS } from '../src/config/tokens.js';

describe('Feature Name', () => {
  let dependency: SomeType;

  beforeAll(async () => {
    dependency = container.resolve<SomeType>(TOKENS.SomeDependency);
  });

  it('should do something', async () => {
    const result = await dependency.method();
    expect(result).toBeDefined();
  });
});
```

### API Testing with Supertest

```typescript
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

it('should return 200', async () => {
  const res = await request(app).get('/health');
  expect(res.status).toBe(200);
});
```

---

## Common Pitfalls

1. **Forgot `reflect-metadata`**: Must import before any DI usage
2. **Missing `.js` extension**: ESM requires explicit extensions
3. **Direct infrastructure usage in domain**: Domain must not import from infrastructure
4. **Not using DI container**: Always resolve dependencies via container in controllers
5. **Type suppression**: Never use `as any`, `@ts-ignore`, or `@ts-expect-error`

## Skills

| Skill | Purpose |
|-------|---------|
| `verify-implementation` | 모든 verify 스킬 순차 실행 → 통합 검증 보고서 생성 |
| `manage-skills` | 세션 변경사항 분석 → verify 스킬 생성/업데이트/AGENTS.md 관리 |
