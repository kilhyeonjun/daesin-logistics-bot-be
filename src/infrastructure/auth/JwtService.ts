import { injectable } from 'tsyringe';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: number;
  email: string;
  name: string | null;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

@injectable()
export class JwtService {
  sign(payload: JwtPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  verify(token: string): JwtPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (typeof decoded === 'string') {
        return null;
      }
      const payload = decoded as Record<string, unknown>;
      if (typeof payload.sub !== 'number' || typeof payload.email !== 'string') {
        return null;
      }
      return {
        sub: payload.sub,
        email: payload.email,
        name: typeof payload.name === 'string' ? payload.name : null,
      };
    } catch {
      return null;
    }
  }
}
