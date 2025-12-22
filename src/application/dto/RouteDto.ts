import type { Route, RouteStats } from '../../domain/entities/Route.js';

export interface RouteDto {
  id?: number;
  searchDate: string;
  lineCode: string;
  lineName: string | null;
  carCode: string | null;
  carNumber: string | null;
  count: number;
  quantity: number;
  sectionFare: number;
  totalFare: number;
}

export interface StatsDto {
  totalRoutes: number;
  totalCount: number;
  totalQuantity: number;
  totalSectionFare: number;
  totalFare: number;
}

export interface SyncResultDto {
  success: boolean;
  count: number;
  date: string;
}

export class RouteMapper {
  static toDto(route: Route): RouteDto {
    return {
      id: route.id,
      searchDate: route.searchDate,
      lineCode: route.lineCode,
      lineName: route.lineName,
      carCode: route.carCode,
      carNumber: route.carNumber,
      count: route.count,
      quantity: route.quantity,
      sectionFare: route.sectionFare,
      totalFare: route.totalFare,
    };
  }

  static toStatsDto(stats: RouteStats): StatsDto {
    return {
      totalRoutes: stats.totalRoutes,
      totalCount: stats.totalCount,
      totalQuantity: stats.totalQuantity,
      totalSectionFare: stats.totalSectionFare,
      totalFare: stats.totalFare,
    };
  }
}
