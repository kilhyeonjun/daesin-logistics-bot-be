import type { Route, RouteStats, MonthlyRouteStats } from '../entities/Route.js';

export interface IRouteRepository {
  findByLineCode(code: string, limit?: number): Promise<Route[]>;
  findByLineName(name: string, limit?: number): Promise<Route[]>;
  findByCarNumber(carNumber: string, limit?: number): Promise<Route[]>;
  findByCarCode(carCode: string, limit?: number): Promise<Route[]>;
  findByDate(date: string): Promise<Route[]>;
  findRecent(limit?: number): Promise<Route[]>;
  getStatsByDate(date: string): Promise<RouteStats>;
  getStatsByMonth(yearMonth: string): Promise<MonthlyRouteStats>;
  upsertMany(routes: Route[]): Promise<number>;
}
