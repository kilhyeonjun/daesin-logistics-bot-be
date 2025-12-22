import { injectable, inject } from 'tsyringe';
import type { IRouteRepository } from '../../domain/repositories/IRouteRepository.js';
import { RouteDto, RouteMapper } from '../dto/RouteDto.js';
import { TOKENS } from '../../config/tokens.js';

@injectable()
export class SearchRoutesByCarUseCase {
  constructor(
    @inject(TOKENS.RouteRepository)
    private readonly routeRepository: IRouteRepository
  ) {}

  async execute(carNumber: string): Promise<RouteDto[]> {
    const routes = await this.routeRepository.findByCarNumber(carNumber, 50);
    return routes.map(RouteMapper.toDto);
  }
}
