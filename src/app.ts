import express, { type Express } from 'express';
import { createRoutes } from './interface/http/routes/index.js';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Routes
  app.use(createRoutes());

  return app;
}
