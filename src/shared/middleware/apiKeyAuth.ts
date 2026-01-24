import type { Request, Response, NextFunction } from 'express';
import { config } from '../../config/environment.js';

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  if (!config.apiKey) {
    next();
    return;
  }

  const apiKey = req.headers['x-api-key'];

  if (apiKey !== config.apiKey) {
    res.status(401).json({ success: false, error: 'Unauthorized: Invalid API Key' });
    return;
  }

  next();
}
