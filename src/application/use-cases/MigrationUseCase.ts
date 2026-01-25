import { injectable, inject } from 'tsyringe';
import { TOKENS } from '../../config/tokens.js';
import type { IMigrationJobRepository } from '../../domain/repositories/IMigrationJobRepository.js';
import type { ICrawler } from '../../domain/ports/ICrawler.js';
import type { IRouteRepository } from '../../domain/repositories/IRouteRepository.js';
import { MigrationJob } from '../../domain/entities/MigrationJob.js';

interface StartMigrationDto {
  startDate: string;
  endDate: string;
}

interface MigrationJobDto {
  id: number;
  startDate: string;
  endDate: string;
  status: string;
  currentDate: string | null;
  totalDays: number;
  completedDays: number;
  progressPercent: number;
  errorMessage: string | null;
  createdAt?: string;
  updatedAt?: string | null;
}

@injectable()
export class MigrationUseCase {
  private isRunning = false;

  constructor(
    @inject(TOKENS.MigrationJobRepository)
    private readonly migrationJobRepository: IMigrationJobRepository,
    @inject(TOKENS.Crawler)
    private readonly crawler: ICrawler,
    @inject(TOKENS.RouteRepository)
    private readonly routeRepository: IRouteRepository
  ) {}

  async startMigration(dto: StartMigrationDto): Promise<MigrationJobDto> {
    const activeJob = await this.migrationJobRepository.findActive();
    if (activeJob) {
      throw new Error('Migration job is already running');
    }

    const totalDays = this.calculateDaysBetween(dto.startDate, dto.endDate);
    if (totalDays <= 0) {
      throw new Error('Invalid date range');
    }

    const job = MigrationJob.create(dto.startDate, dto.endDate, totalDays);
    const savedJob = await this.migrationJobRepository.create(job);

    this.runMigrationAsync(savedJob);

    return this.toDto(savedJob);
  }

  async getJob(id: number): Promise<MigrationJobDto | null> {
    const job = await this.migrationJobRepository.findById(id);
    return job ? this.toDto(job) : null;
  }

  async getAllJobs(): Promise<MigrationJobDto[]> {
    const jobs = await this.migrationJobRepository.findAll();
    return jobs.map(this.toDto);
  }

  async getActiveJob(): Promise<MigrationJobDto | null> {
    const job = await this.migrationJobRepository.findActive();
    return job ? this.toDto(job) : null;
  }

  async cancelJob(id: number): Promise<MigrationJobDto> {
    const job = await this.migrationJobRepository.findById(id);
    if (!job) {
      throw new Error('Job not found');
    }
    if (!job.isActive()) {
      throw new Error('Job is not active');
    }

    job.status = 'cancelled';
    const updated = await this.migrationJobRepository.update(job);
    return this.toDto(updated);
  }

  private async runMigrationAsync(job: MigrationJob): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      job.status = 'running';
      await this.migrationJobRepository.update(job);

      const dates = this.generateDateRange(job.startDate, job.endDate);

      for (const date of dates) {
        const currentJob = await this.migrationJobRepository.findById(job.id!);
        if (!currentJob || currentJob.status === 'cancelled') {
          break;
        }

        try {
          job.currentDate = date;
          await this.migrationJobRepository.update(job);

          const routes = await this.crawler.crawl(date);
          if (routes.length > 0) {
            await this.routeRepository.upsertMany(routes);
          }

          job.completedDays++;
          await this.migrationJobRepository.update(job);

          await this.delay(1000);
        } catch (error) {
          console.error(`Migration error for date ${date}:`, error);
        }
      }

      const finalJob = await this.migrationJobRepository.findById(job.id!);
      if (finalJob && finalJob.status === 'running') {
        finalJob.status = 'completed';
        await this.migrationJobRepository.update(finalJob);
      }
    } catch (error) {
      job.status = 'failed';
      job.errorMessage = error instanceof Error ? error.message : String(error);
      await this.migrationJobRepository.update(job);
    } finally {
      this.isRunning = false;
    }
  }

  private calculateDaysBetween(startDate: string, endDate: string): number {
    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  private generateDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);

    const current = new Date(start);
    while (current <= end) {
      dates.push(this.formatDate(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  private parseDate(dateStr: string): Date {
    const year = parseInt(dateStr.slice(0, 4), 10);
    const month = parseInt(dateStr.slice(4, 6), 10) - 1;
    const day = parseInt(dateStr.slice(6, 8), 10);
    return new Date(year, month, day);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private toDto(job: MigrationJob): MigrationJobDto {
    return {
      id: job.id!,
      startDate: job.startDate,
      endDate: job.endDate,
      status: job.status,
      currentDate: job.currentDate,
      totalDays: job.totalDays,
      completedDays: job.completedDays,
      progressPercent: job.progressPercent,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}
