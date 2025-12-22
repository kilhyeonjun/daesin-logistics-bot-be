import { injectable, inject } from 'tsyringe';
import type { Request, Response } from 'express';
import { SyncRoutesUseCase } from '../../../application/use-cases/SyncRoutesUseCase.js';

@injectable()
export class SyncController {
  constructor(
    @inject(SyncRoutesUseCase)
    private readonly syncRoutes: SyncRoutesUseCase
  ) {}

  async sync(req: Request, res: Response): Promise<void> {
    try {
      const { date } = req.body as { date?: string };
      const result = await this.syncRoutes.execute(date);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  }

  health(_req: Request, res: Response): void {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  }
}
