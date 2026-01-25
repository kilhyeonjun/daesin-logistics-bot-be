import 'reflect-metadata';
import { container } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import { TOKENS } from './tokens.js';

// Repositories
import type { IRouteRepository } from '../domain/repositories/IRouteRepository.js';
import { PrismaRouteRepository } from '../infrastructure/persistence/PrismaRouteRepository.js';
import type { IMigrationJobRepository } from '../domain/repositories/IMigrationJobRepository.js';
import { PrismaMigrationJobRepository } from '../infrastructure/persistence/PrismaMigrationJobRepository.js';

// Ports
import type { ICrawler } from '../domain/ports/ICrawler.js';
import { CheerioHttpCrawler } from '../infrastructure/crawling/CheerioHttpCrawler.js';

// Use Cases
import { SearchRoutesByCodeUseCase } from '../application/use-cases/SearchRoutesByCodeUseCase.js';
import { SearchRoutesByNameUseCase } from '../application/use-cases/SearchRoutesByNameUseCase.js';
import { SearchRoutesByCarUseCase } from '../application/use-cases/SearchRoutesByCarUseCase.js';
import { SyncRoutesUseCase } from '../application/use-cases/SyncRoutesUseCase.js';
import { GetStatsUseCase } from '../application/use-cases/GetStatsUseCase.js';
import { MigrationUseCase } from '../application/use-cases/MigrationUseCase.js';

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

  // Ports
  container.register<ICrawler>(TOKENS.Crawler, {
    useClass: CheerioHttpCrawler,
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
  container.register(MigrationUseCase, {
    useClass: MigrationUseCase,
  });
}

export async function disconnectDatabase(): Promise<void> {
  if (prismaClient) {
    await prismaClient.$disconnect();
    prismaClient = null;
  }
}

export { container };
