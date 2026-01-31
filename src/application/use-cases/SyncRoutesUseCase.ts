import { injectable, inject } from 'tsyringe';
import type { IRouteRepository } from '../../domain/repositories/IRouteRepository.js';
import type { ICrawler } from '../../domain/ports/ICrawler.js';
import type { ICacheService } from '../../domain/ports/ICacheService.js';
import { SearchDate } from '../../domain/value-objects/SearchDate.js';
import { SyncResultDto } from '../dto/RouteDto.js';
import { TOKENS } from '../../config/tokens.js';

@injectable()
export class SyncRoutesUseCase {
  constructor(
    @inject(TOKENS.Crawler)
    private readonly crawler: ICrawler,
    @inject(TOKENS.RouteRepository)
    private readonly routeRepository: IRouteRepository,
    @inject(TOKENS.CacheService)
    private readonly cacheService: ICacheService
  ) {}

  async execute(date?: string): Promise<SyncResultDto> {
    const searchDate = date
      ? SearchDate.create(date)
      : SearchDate.defaultForCrawling();

    console.log(`[${new Date().toLocaleString()}] 크롤링 시작: ${searchDate.getValue()}`);

    const routes = await this.crawler.crawl(searchDate.getValue(), {
      lineStart: '100000',
      lineEnd: '999999',
    });

    if (routes.length > 0) {
      const insertedCount = await this.routeRepository.upsertMany(routes);

      const invalidatedCount = await this.cacheService.invalidateByPattern(
        `routes:*:${searchDate.getValue()}`
      );
      console.log(`[${new Date().toLocaleString()}] ${insertedCount}건 저장, ${invalidatedCount}건 캐시 무효화 완료`);

      return { success: true, count: insertedCount, date: searchDate.getValue() };
    }

    console.log(`[${new Date().toLocaleString()}] 데이터 없음`);
    return { success: true, count: 0, date: searchDate.getValue() };
  }
}
