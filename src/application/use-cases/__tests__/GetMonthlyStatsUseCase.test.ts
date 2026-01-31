import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetMonthlyStatsUseCase } from '../GetMonthlyStatsUseCase.js';
import type { IRouteRepository } from '../../../domain/repositories/IRouteRepository.js';
import type { MonthlyRouteStats } from '../../../domain/entities/Route.js';

describe('GetMonthlyStatsUseCase', () => {
  let useCase: GetMonthlyStatsUseCase;
  let mockRepository: IRouteRepository;

  beforeEach(() => {
    mockRepository = {
      findByLineCode: vi.fn(),
      findByLineName: vi.fn(),
      findByCarNumber: vi.fn(),
      findByCarCode: vi.fn(),
      findByDate: vi.fn(),
      findRecent: vi.fn(),
      getStatsByDate: vi.fn(),
      getStatsByMonth: vi.fn(),
      upsertMany: vi.fn(),
    };

    useCase = new GetMonthlyStatsUseCase(mockRepository);
  });

  describe('정상 케이스', () => {
    it('월별 통계를 정상적으로 반환한다', async () => {
      const mockStats: MonthlyRouteStats = {
        days: {
          '20260101': {
            totalRoutes: 100,
            totalCount: 500,
            totalQuantity: 800,
            totalSectionFare: 50000,
            totalFare: 75000,
          },
          '20260102': {
            totalRoutes: 120,
            totalCount: 600,
            totalQuantity: 900,
            totalSectionFare: 60000,
            totalFare: 85000,
          },
        },
      };

      vi.mocked(mockRepository.getStatsByMonth).mockResolvedValue(mockStats);

      const result = await useCase.execute('202601');

      expect(mockRepository.getStatsByMonth).toHaveBeenCalledWith('202601');
      expect(result.days).toHaveProperty('20260101');
      expect(result.days).toHaveProperty('20260102');
      expect(result.days['20260101'].totalRoutes).toBe(100);
      expect(result.days['20260102'].totalRoutes).toBe(120);
    });

    it('여러 날짜의 통계를 올바르게 매핑한다', async () => {
      const mockStats: MonthlyRouteStats = {
        days: {
          '20260115': {
            totalRoutes: 50,
            totalCount: 250,
            totalQuantity: 400,
            totalSectionFare: 25000,
            totalFare: 37500,
          },
        },
      };

      vi.mocked(mockRepository.getStatsByMonth).mockResolvedValue(mockStats);

      const result = await useCase.execute('202601');

      expect(result.days['20260115']).toEqual({
        totalRoutes: 50,
        totalCount: 250,
        totalQuantity: 400,
        totalSectionFare: 25000,
        totalFare: 37500,
      });
    });
  });

  describe('빈 데이터 케이스', () => {
    it('데이터가 없으면 빈 days 객체를 반환한다', async () => {
      const emptyStats: MonthlyRouteStats = {
        days: {},
      };

      vi.mocked(mockRepository.getStatsByMonth).mockResolvedValue(emptyStats);

      const result = await useCase.execute('202512');

      expect(mockRepository.getStatsByMonth).toHaveBeenCalledWith('202512');
      expect(result.days).toEqual({});
      expect(Object.keys(result.days)).toHaveLength(0);
    });
  });

  describe('유효성 검증', () => {
    it('잘못된 형식의 yearMonth는 ValidationError를 발생시킨다', async () => {
      await expect(useCase.execute('2026-01')).rejects.toThrow(
        'YearMonth must be YYYYMM format (6 digits)'
      );
    });

    it('유효하지 않은 월은 ValidationError를 발생시킨다', async () => {
      await expect(useCase.execute('202613')).rejects.toThrow(
        'Month must be between 01 and 12'
      );
    });
  });
});
