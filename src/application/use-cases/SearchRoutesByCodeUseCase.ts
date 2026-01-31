import { injectable, inject } from 'tsyringe';
import type { IRouteRepository } from '../../domain/repositories/IRouteRepository.js';
import type { ICacheService } from '../../domain/ports/ICacheService.js';
import { RouteDto, RouteMapper } from '../dto/RouteDto.js';
import { SearchDate } from '../../domain/value-objects/SearchDate.js';
import { TOKENS } from '../../config/tokens.js';

const CACHE_TTL_SECONDS = 3600;

@injectable()
export class SearchRoutesByCodeUseCase {
  constructor(
    @inject(TOKENS.RouteRepository)
    private readonly routeRepository: IRouteRepository,
    @inject(TOKENS.CacheService)
    private readonly cacheService: ICacheService
  ) {}

  async execute(code: string): Promise<RouteDto[]> {
    const today = SearchDate.today().getValue();
    const cacheKey = `routes:byCode:${code}:${today}`;

    const cached = await this.cacheService.get<RouteDto[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const routes = await this.routeRepository.findByLineCode(code, 50);
    const dtos = routes.map(RouteMapper.toDto);

    await this.cacheService.set(cacheKey, dtos, CACHE_TTL_SECONDS);

    return dtos;
  }
}
