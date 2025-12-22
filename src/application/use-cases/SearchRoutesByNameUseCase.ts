import { injectable, inject } from 'tsyringe';
import type { IRouteRepository } from '../../domain/repositories/IRouteRepository.js';
import { RouteDto, RouteMapper } from '../dto/RouteDto.js';
import { TOKENS } from '../../config/tokens.js';

@injectable()
export class SearchRoutesByNameUseCase {
  constructor(
    @inject(TOKENS.RouteRepository)
    private readonly routeRepository: IRouteRepository
  ) {}

  async execute(name: string): Promise<RouteDto[]> {
    const routes = await this.routeRepository.findByLineName(name, 50);
    return routes.map(RouteMapper.toDto);
  }
}
