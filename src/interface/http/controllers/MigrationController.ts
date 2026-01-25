import type { Request, Response } from 'express';
import { container } from 'tsyringe';
import { MigrationUseCase } from '../../../application/use-cases/MigrationUseCase.js';

export class MigrationController {
  private readonly migrationUseCase: MigrationUseCase;

  constructor() {
    this.migrationUseCase = container.resolve(MigrationUseCase);
  }

  async startMigration(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.body;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'startDate and endDate are required',
        });
        return;
      }

      if (!/^\d{8}$/.test(startDate) || !/^\d{8}$/.test(endDate)) {
        res.status(400).json({
          success: false,
          error: 'Date format must be YYYYMMDD',
        });
        return;
      }

      const job = await this.migrationUseCase.startMigration({ startDate, endDate });
      res.status(201).json({ success: true, data: job });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(400).json({ success: false, error: message });
    }
  }

  async getJob(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const job = await this.migrationUseCase.getJob(id);

      if (!job) {
        res.status(404).json({ success: false, error: 'Job not found' });
        return;
      }

      res.json({ success: true, data: job });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  }

  async getAllJobs(_req: Request, res: Response): Promise<void> {
    try {
      const jobs = await this.migrationUseCase.getAllJobs();
      res.json({ success: true, data: jobs });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  }

  async getActiveJob(_req: Request, res: Response): Promise<void> {
    try {
      const job = await this.migrationUseCase.getActiveJob();
      res.json({ success: true, data: job });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  }

  async cancelJob(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const job = await this.migrationUseCase.cancelJob(id);
      res.json({ success: true, data: job });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(400).json({ success: false, error: message });
    }
  }
}
