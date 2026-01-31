import 'reflect-metadata';
import { container } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import { TOKENS } from './tokens.js';

// Repositories
import type { IRouteRepository } from '../domain/repositories/IRouteRepository.js';
import { PrismaRouteRepository } from '../infrastructure/persistence/PrismaRouteRepository.js';
import type { IMigrationJobRepository } from '../domain/repositories/IMigrationJobRepository.js';
import { PrismaMigrationJobRepository } from '../infrastructure/persistence/PrismaMigrationJobRepository.js';
import type { IAdminRepository } from '../domain/repositories/IAdminRepository.js';
import { PrismaAdminRepository } from '../infrastructure/persistence/PrismaAdminRepository.js';

// Ports
import type { ICrawler } from '../domain/ports/ICrawler.js';
import { CheerioHttpCrawler } from '../infrastructure/crawling/CheerioHttpCrawler.js';
import type { ICacheService } from '../domain/ports/ICacheService.js';
import { InMemoryCacheService } from '../infrastructure/cache/InMemoryCacheService.js';

// Auth Services
import { PasswordService } from '../infrastructure/auth/PasswordService.js';
import { JwtService } from '../infrastructure/auth/JwtService.js';

// Use Cases
import { SearchRoutesByCodeUseCase } from '../application/use-cases/SearchRoutesByCodeUseCase.js';
import { SearchRoutesByNameUseCase } from '../application/use-cases/SearchRoutesByNameUseCase.js';
import { SearchRoutesByCarUseCase } from '../application/use-cases/SearchRoutesByCarUseCase.js';
import { SyncRoutesUseCase } from '../application/use-cases/SyncRoutesUseCase.js';
import { GetStatsUseCase } from '../application/use-cases/GetStatsUseCase.js';
import { GetMonthlyStatsUseCase } from '../application/use-cases/GetMonthlyStatsUseCase.js';
import { MigrationUseCase } from '../application/use-cases/MigrationUseCase.js';
import { LoginUseCase } from '../application/use-cases/LoginUseCase.js';

let prismaClient: PrismaClient | null = null;

export function configureContainer(): void {
  // Infrastructure - Prisma Client (Singleton)
  prismaClient = new PrismaClient({});
  container.registerInstance(TOKENS.PrismaClient, prismaClient);

  // Repositories
  container.register<IRouteRepository>(TOKENS.RouteRepository, {
    useClass: PrismaRouteRepository,
  });
  container.register<IMigrationJobRepository>(TOKENS.MigrationJobRepository, {
    useClass: PrismaMigrationJobRepository,
  });
  container.register<IAdminRepository>(TOKENS.AdminRepository, {
    useClass: PrismaAdminRepository,
  });

  // Ports
  container.register<ICrawler>(TOKENS.Crawler, {
    useClass: CheerioHttpCrawler,
  });
  container.registerSingleton<ICacheService>(TOKENS.CacheService, InMemoryCacheService);

  // Auth Services
  container.register(TOKENS.PasswordService, {
    useClass: PasswordService,
  });
  container.register(TOKENS.JwtService, {
    useClass: JwtService,
  });

  // Use Cases
  container.register(SearchRoutesByCodeUseCase, {
    useClass: SearchRoutesByCodeUseCase,
  });
  container.register(SearchRoutesByNameUseCase, {
    useClass: SearchRoutesByNameUseCase,
  });
  container.register(SearchRoutesByCarUseCase, {
    useClass: SearchRoutesByCarUseCase,
  });
  container.register(SyncRoutesUseCase, {
    useClass: SyncRoutesUseCase,
  });
  container.register(GetStatsUseCase, {
    useClass: GetStatsUseCase,
  });
  container.register(GetMonthlyStatsUseCase, {
    useClass: GetMonthlyStatsUseCase,
  });
  container.register(MigrationUseCase, {
    useClass: MigrationUseCase,
  });
  container.register(TOKENS.LoginUseCase, {
    useClass: LoginUseCase,
  });
}

export async function disconnectDatabase(): Promise<void> {
  if (prismaClient) {
    await prismaClient.$disconnect();
    prismaClient = null;
  }
}

export { container };
