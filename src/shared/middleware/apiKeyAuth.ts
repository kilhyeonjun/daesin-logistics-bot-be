import type { Request, Response, NextFunction } from 'express';
import { config } from '../../config/environment.js';

export function getApiKeyAuthStatus(
  configuredKey: string,
  providedKey: string | string[] | undefined
): 401 | 503 | null {
  if (!configuredKey) return 503;
  if (providedKey !== configuredKey) return 401;
  return null;
}

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const status = getApiKeyAuthStatus(config.apiKey, req.headers['x-api-key']);
  if (status === 503) {
    res.status(503).json({ success: false, error: 'API authentication is not configured' });
    return;
  }
  if (status === 401) {
    res.status(401).json({ success: false, error: 'Unauthorized: Invalid API Key' });
    return;
  }

  next();
}
