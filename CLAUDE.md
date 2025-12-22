# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run build          # Prisma generate + TypeScript compile
npm run dev            # Development server with hot reload (tsx watch)
npm start              # Production server (requires build first)
npm run sync           # Manual data sync from crawler
npm test               # Run all tests (vitest)
npm run test:watch     # Watch mode for tests
npm run test:integration  # Build + integration tests
```

## Architecture Overview

This project follows **Clean Architecture** with **TSyringe** DI and **Prisma** ORM.

### Layer Structure

```
src/
├── domain/           # Core business logic (no external dependencies)
│   ├── entities/     # Route entity
│   ├── repositories/ # IRouteRepository interface
│   ├── ports/        # ICrawler interface (external services)
│   └── value-objects/# LineCode, SearchDate
├── application/      # Use Cases orchestrating domain logic
│   ├── use-cases/    # SearchByCode, SearchByName, SearchByCar, SyncRoutes, GetStats
│   └── dto/          # Data transfer objects
├── infrastructure/   # External implementations
│   ├── persistence/  # PrismaRouteRepository
│   └── crawling/     # CheerioHttpCrawler
├── interface/        # Entry points
│   ├── http/         # REST controllers and routes
│   └── kakao/        # Kakao chatbot skill controller
└── config/           # DI container and tokens
```

### Dependency Injection

- Container configured in `src/config/container.ts`
- DI tokens defined in `src/config/tokens.ts`
- Use `@injectable()` decorator on classes and `@inject(TOKENS.*)` for dependencies
- Must import `reflect-metadata` before any DI usage

### Key Patterns

- **Repositories** (`domain/repositories/`): Data storage interfaces
- **Ports** (`domain/ports/`): External service interfaces (crawler)
- **Use Cases** (`application/use-cases/`): Single responsibility business operations
- **Controllers** resolve Use Cases from DI container

### Database

- SQLite with Prisma ORM
- Schema: `prisma/schema.prisma`
- Run `npx prisma db push` after schema changes
- Environment: `DATABASE_URL=file:./logistics.db`

## Testing

Tests use Vitest with DI container configured in `tests/setup.ts`. The setup file:
1. Imports `reflect-metadata`
2. Sets environment variables
3. Calls `configureContainer()` before tests run
