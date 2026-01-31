import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import type { IRouteRepository } from '../../domain/repositories/IRouteRepository.js';
import { Route, RouteStats, MonthlyRouteStats } from '../../domain/entities/Route.js';
import { TOKENS } from '../../config/tokens.js';

@injectable()
export class PrismaRouteRepository implements IRouteRepository {
  constructor(
    @inject(TOKENS.PrismaClient)
    private readonly prisma: PrismaClient
  ) {}

  async findByLineCode(code: string, limit = 50): Promise<Route[]> {
    const records = await this.prisma.route.findMany({
      where: { lineCode: { contains: code } },
      orderBy: { searchDate: 'desc' },
      take: limit,
    });
    return records.map(this.toDomain);
  }

  async findByLineName(name: string, limit = 50): Promise<Route[]> {
    const records = await this.prisma.route.findMany({
      where: { lineName: { contains: name } },
      orderBy: { searchDate: 'desc' },
      take: limit,
    });
    return records.map(this.toDomain);
  }

  async findByCarNumber(carNumber: string, limit = 50): Promise<Route[]> {
    const records = await this.prisma.route.findMany({
      where: { carNumber: { contains: carNumber } },
      orderBy: { searchDate: 'desc' },
      take: limit,
    });
    return records.map(this.toDomain);
  }

  async findByCarCode(carCode: string, limit = 50): Promise<Route[]> {
    const records = await this.prisma.route.findMany({
      where: { carCode: { contains: carCode } },
      orderBy: { searchDate: 'desc' },
      take: limit,
    });
    return records.map(this.toDomain);
  }

  async findByDate(date: string): Promise<Route[]> {
    const records = await this.prisma.route.findMany({
      where: { searchDate: date },
      orderBy: { lineCode: 'asc' },
    });
    return records.map(this.toDomain);
  }

  async findRecent(limit = 20): Promise<Route[]> {
    const records = await this.prisma.route.findMany({
      orderBy: [{ searchDate: 'desc' }, { lineCode: 'asc' }],
      take: limit,
    });
    return records.map(this.toDomain);
  }

  async getStatsByDate(date: string): Promise<RouteStats> {
    const result = await this.prisma.route.aggregate({
      where: { searchDate: date },
      _count: { id: true },
      _sum: {
        count: true,
        quantity: true,
        sectionFare: true,
        totalFare: true,
      },
    });

    return {
      totalRoutes: result._count.id,
      totalCount: result._sum.count ?? 0,
      totalQuantity: result._sum.quantity ?? 0,
      totalSectionFare: result._sum.sectionFare ?? 0,
      totalFare: result._sum.totalFare ?? 0,
    };
  }

  async getStatsByMonth(yearMonth: string): Promise<MonthlyRouteStats> {
    const routes = await this.prisma.route.groupBy({
      by: ['searchDate'],
      where: {
        searchDate: {
          startsWith: yearMonth,
        },
      },
      _count: { id: true },
      _sum: {
        count: true,
        quantity: true,
        sectionFare: true,
        totalFare: true,
      },
      orderBy: { searchDate: 'asc' },
    });

    const days: Record<string, RouteStats> = {};
    for (const row of routes) {
      days[row.searchDate] = {
        totalRoutes: row._count.id,
        totalCount: row._sum.count ?? 0,
        totalQuantity: row._sum.quantity ?? 0,
        totalSectionFare: row._sum.sectionFare ?? 0,
        totalFare: row._sum.totalFare ?? 0,
      };
    }

    return { days };
  }

  async upsertMany(routes: Route[]): Promise<number> {
    const operations = routes.map((route) =>
      this.prisma.route.upsert({
        where: {
          searchDate_lineCode: {
            searchDate: route.searchDate,
            lineCode: route.lineCode,
          },
        },
        create: {
          searchDate: route.searchDate,
          lineCode: route.lineCode,
          lineName: route.lineName,
          carCode: route.carCode,
          carNumber: route.carNumber,
          count: route.count,
          quantity: route.quantity,
          sectionFare: route.sectionFare,
          totalFare: route.totalFare,
          raceInfoUrl: route.raceInfoUrl,
          carDetailUrl: route.carDetailUrl,
          trackingUrl: route.trackingUrl,
          waypointUrl: route.waypointUrl,
        },
        update: {
          lineName: route.lineName,
          carCode: route.carCode,
          carNumber: route.carNumber,
          count: route.count,
          quantity: route.quantity,
          sectionFare: route.sectionFare,
          totalFare: route.totalFare,
          raceInfoUrl: route.raceInfoUrl,
          carDetailUrl: route.carDetailUrl,
          trackingUrl: route.trackingUrl,
          waypointUrl: route.waypointUrl,
        },
      })
    );

    const results = await this.prisma.$transaction(operations);
    return results.length;
  }

  private toDomain(record: {
    id: number;
    searchDate: string;
    lineCode: string;
    lineName: string | null;
    carCode: string | null;
    carNumber: string | null;
    count: number | null;
    quantity: number | null;
    sectionFare: number | null;
    totalFare: number | null;
    createdAt: string | null;
    raceInfoUrl: string | null;
    carDetailUrl: string | null;
    trackingUrl: string | null;
    waypointUrl: string | null;
  }): Route {
    return new Route({
      id: record.id,
      searchDate: record.searchDate,
      lineCode: record.lineCode,
      lineName: record.lineName,
      carCode: record.carCode,
      carNumber: record.carNumber,
      count: record.count ?? 0,
      quantity: record.quantity ?? 0,
      sectionFare: record.sectionFare ?? 0,
      totalFare: record.totalFare ?? 0,
      createdAt: record.createdAt ?? undefined,
      raceInfoUrl: record.raceInfoUrl,
      carDetailUrl: record.carDetailUrl,
      trackingUrl: record.trackingUrl,
      waypointUrl: record.waypointUrl,
    });
  }
}
