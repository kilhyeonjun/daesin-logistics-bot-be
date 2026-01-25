import express, { type Express } from 'express';
import cors from 'cors';
import { createRoutes } from './interface/http/routes/index.js';

export function createApp(): Express {
  const app = express();

  app.use(cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      /\.vercel\.app$/,
    ],
    credentials: true,
  }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Routes
  app.use(createRoutes());

  return app;
}
