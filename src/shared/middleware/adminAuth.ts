import type { Request, Response, NextFunction } from 'express';
import { container } from '../../config/container.js';
import { TOKENS } from '../../config/tokens.js';
import { JwtService, JwtPayload } from '../../infrastructure/auth/JwtService.js';

declare global {
  namespace Express {
    interface Request {
      admin?: JwtPayload;
    }
  }
}

export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Unauthorized: Missing token' });
    return;
  }

  const token = authHeader.slice(7);
  const jwtService = container.resolve<JwtService>(TOKENS.JwtService);
  const payload = jwtService.verify(token);

  if (!payload) {
    res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    return;
  }

  req.admin = payload;
  next();
}
