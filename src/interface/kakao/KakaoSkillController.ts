import { injectable, inject } from 'tsyringe';
import type { Request, Response } from 'express';
import { SearchRoutesByCodeUseCase } from '../../application/use-cases/SearchRoutesByCodeUseCase.js';
import { SearchRoutesByNameUseCase } from '../../application/use-cases/SearchRoutesByNameUseCase.js';
import { SearchRoutesByCarUseCase } from '../../application/use-cases/SearchRoutesByCarUseCase.js';
import { GetStatsUseCase } from '../../application/use-cases/GetStatsUseCase.js';
import { SearchDate } from '../../domain/value-objects/SearchDate.js';
import { UtteranceParser } from './UtteranceParser.js';
import { KakaoResponseFormatter } from './KakaoResponseFormatter.js';
import type { KakaoSkillRequest } from '../../shared/types/kakao.js';

@injectable()
export class KakaoSkillController {
  private readonly parser = new UtteranceParser();
  private readonly formatter = new KakaoResponseFormatter();

  constructor(
    @inject(SearchRoutesByCodeUseCase)
    private readonly searchByCode: SearchRoutesByCodeUseCase,
    @inject(SearchRoutesByNameUseCase)
    private readonly searchByName: SearchRoutesByNameUseCase,
    @inject(SearchRoutesByCarUseCase)
    private readonly searchByCar: SearchRoutesByCarUseCase,
    @inject(GetStatsUseCase)
    private readonly getStats: GetStatsUseCase
  ) {}

  async handleSkill(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as KakaoSkillRequest;
      const utterance = body.userRequest?.utterance?.trim() || '';
      const command = this.parser.parse(utterance);

      let response;

      switch (command.type) {
        case 'HELP':
          response = this.formatter.helpMessage();
          break;

        case 'SEARCH_BY_CODE':
        case 'NUMERIC_CODE': {
          const code = command.type === 'NUMERIC_CODE' ? command.value : command.value;
          const routes = await this.searchByCode.execute(code);
          response = this.formatter.formatRoutes(routes);
          break;
        }

        case 'SEARCH_BY_CAR': {
          const routes = await this.searchByCar.execute(command.value);
          response = this.formatter.formatRoutes(routes);
          break;
        }

        case 'SEARCH_BY_NAME': {
          const routes = await this.searchByName.execute(command.value);
          response = this.formatter.formatRoutes(routes);
          break;
        }

        case 'TODAY_STATS': {
          const today = SearchDate.defaultForCrawling();
          const stats = await this.getStats.execute(today.getValue());
          response = this.formatter.formatStats(stats, today.getValue());
          break;
        }

        case 'YESTERDAY_STATS': {
          const yesterday = SearchDate.yesterday();
          const stats = await this.getStats.execute(yesterday.getValue());
          response = this.formatter.formatStats(stats, yesterday.getValue());
          break;
        }

        default:
          response = this.formatter.errorMessage(utterance);
      }

      res.json(response);
    } catch (error) {
      console.error('Kakao skill error:', error);
      res.json(this.formatter.simpleText('처리 중 오류가 발생했습니다.'));
    }
  }
}
