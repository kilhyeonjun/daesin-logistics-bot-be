import { injectable, inject } from 'tsyringe';
import type { Request, Response } from 'express';
import { LoginUseCase } from '../../../application/use-cases/LoginUseCase.js';
import { ValidationError } from '../../../shared/errors/DomainError.js';
import { TOKENS } from '../../../config/tokens.js';

@injectable()
export class AuthController {
  constructor(
    @inject(TOKENS.LoginUseCase)
    private readonly loginUseCase: LoginUseCase
  ) {}

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ success: false, error: 'Email and password are required' });
        return;
      }

      const result = await this.loginUseCase.execute({ email, password });
      res.json({ success: true, ...result });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(401).json({ success: false, error: error.message });
        return;
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  }

  async me(req: Request, res: Response): Promise<void> {
    if (!req.admin) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    res.json({
      success: true,
      admin: {
        id: req.admin.sub,
        email: req.admin.email,
        name: req.admin.name,
      },
    });
  }
}
