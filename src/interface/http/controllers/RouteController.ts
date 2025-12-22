import { injectable, inject } from 'tsyringe';
import type { Request, Response } from 'express';
import { SearchRoutesByCodeUseCase } from '../../../application/use-cases/SearchRoutesByCodeUseCase.js';
import { SearchRoutesByNameUseCase } from '../../../application/use-cases/SearchRoutesByNameUseCase.js';
import { SearchRoutesByCarUseCase } from '../../../application/use-cases/SearchRoutesByCarUseCase.js';
import { GetStatsUseCase } from '../../../application/use-cases/GetStatsUseCase.js';
import type { IRouteRepository } from '../../../domain/repositories/IRouteRepository.js';
import { TOKENS } from '../../../config/tokens.js';
import { RouteMapper } from '../../../application/dto/RouteDto.js';

@injectable()
export class RouteController {
  constructor(
    @inject(SearchRoutesByCodeUseCase)
    private readonly searchByCode: SearchRoutesByCodeUseCase,
    @inject(SearchRoutesByNameUseCase)
    private readonly searchByName: SearchRoutesByNameUseCase,
    @inject(SearchRoutesByCarUseCase)
    private readonly searchByCar: SearchRoutesByCarUseCase,
    @inject(GetStatsUseCase)
    private readonly getStats: GetStatsUseCase,
    @inject(TOKENS.RouteRepository)
    private readonly routeRepository: IRouteRepository
  ) {}

  async findByCode(req: Request, res: Response): Promise<void> {
    try {
      const routes = await this.searchByCode.execute(req.params.code);
      res.json(routes);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  }

  async findByName(req: Request, res: Response): Promise<void> {
    try {
      const routes = await this.searchByName.execute(req.params.name);
      res.json(routes);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  }

  async findByCar(req: Request, res: Response): Promise<void> {
    try {
      const routes = await this.searchByCar.execute(req.params.number);
      res.json(routes);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  }

  async findByDate(req: Request, res: Response): Promise<void> {
    try {
      const routes = await this.routeRepository.findByDate(req.params.date);
      res.json(routes.map(RouteMapper.toDto));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  }

  async getStatsByDate(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.getStats.execute(req.params.date);
      res.json(stats);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  }
}
