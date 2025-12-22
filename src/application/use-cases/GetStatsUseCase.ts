import { injectable, inject } from 'tsyringe';
import type { IRouteRepository } from '../../domain/repositories/IRouteRepository.js';
import { SearchDate } from '../../domain/value-objects/SearchDate.js';
import { StatsDto, RouteMapper } from '../dto/RouteDto.js';
import { TOKENS } from '../../config/tokens.js';

@injectable()
export class GetStatsUseCase {
  constructor(
    @inject(TOKENS.RouteRepository)
    private readonly routeRepository: IRouteRepository
  ) {}

  async execute(date: string): Promise<StatsDto> {
    const searchDate = SearchDate.create(date);
    const stats = await this.routeRepository.getStatsByDate(searchDate.getValue());
    return RouteMapper.toStatsDto(stats);
  }
}
