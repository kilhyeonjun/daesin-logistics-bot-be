export const TOKENS = {
  // Infrastructure
  PrismaClient: Symbol.for('PrismaClient'),

  // Repositories
  RouteRepository: Symbol.for('IRouteRepository'),

  // Ports
  Crawler: Symbol.for('ICrawler'),

  // Use Cases
  SearchRoutesByCodeUseCase: Symbol.for('SearchRoutesByCodeUseCase'),
  SearchRoutesByNameUseCase: Symbol.for('SearchRoutesByNameUseCase'),
  SearchRoutesByCarUseCase: Symbol.for('SearchRoutesByCarUseCase'),
  SyncRoutesUseCase: Symbol.for('SyncRoutesUseCase'),
  GetStatsUseCase: Symbol.for('GetStatsUseCase'),
} as const;
