import { injectable, inject } from 'tsyringe';
import type { IRouteRepository } from '../../domain/repositories/IRouteRepository.js';
import { YearMonth } from '../../domain/value-objects/YearMonth.js';
import { MonthlyStatsDto, RouteMapper } from '../dto/RouteDto.js';
import { TOKENS } from '../../config/tokens.js';

@injectable()
export class GetMonthlyStatsUseCase {
  constructor(
    @inject(TOKENS.RouteRepository)
    private readonly routeRepository: IRouteRepository
  ) {}

  async execute(yearMonth: string): Promise<MonthlyStatsDto> {
    const ym = YearMonth.create(yearMonth);
    const stats = await this.routeRepository.getStatsByMonth(ym.getValue());
    return RouteMapper.toMonthlyStatsDto(stats);
  }
}
