export const TOKENS = {
  // Infrastructure
  PrismaClient: Symbol.for('PrismaClient'),

  // Repositories
  RouteRepository: Symbol.for('IRouteRepository'),
  MigrationJobRepository: Symbol.for('IMigrationJobRepository'),
  AdminRepository: Symbol.for('IAdminRepository'),

  // Ports
  Crawler: Symbol.for('ICrawler'),
  CacheService: Symbol.for('ICacheService'),

  // Auth Services
  PasswordService: Symbol.for('PasswordService'),
  JwtService: Symbol.for('JwtService'),

  // Use Cases
  SearchRoutesByCodeUseCase: Symbol.for('SearchRoutesByCodeUseCase'),
  SearchRoutesByNameUseCase: Symbol.for('SearchRoutesByNameUseCase'),
  SearchRoutesByCarUseCase: Symbol.for('SearchRoutesByCarUseCase'),
  SyncRoutesUseCase: Symbol.for('SyncRoutesUseCase'),
  GetStatsUseCase: Symbol.for('GetStatsUseCase'),
  GetMonthlyStatsUseCase: Symbol.for('GetMonthlyStatsUseCase'),
  MigrationUseCase: Symbol.for('MigrationUseCase'),
  LoginUseCase: Symbol.for('LoginUseCase'),
} as const;
