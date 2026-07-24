import 'dotenv/config';

interface RuntimeEnvironment {
  NODE_ENV?: string;
  API_KEY?: string;
  JWT_SECRET?: string;
}

export function validateEnvironment(env: RuntimeEnvironment): void {
  if (env.NODE_ENV === 'production' && !env.API_KEY?.trim()) {
    throw new Error('API_KEY is required in production');
  }
  if (env.NODE_ENV === 'production' && !env.JWT_SECRET?.trim()) {
    throw new Error('JWT_SECRET is required in production');
  }
}

validateEnvironment({
  NODE_ENV: process.env.NODE_ENV,
  API_KEY: process.env.API_KEY,
  JWT_SECRET: process.env.JWT_SECRET,
});

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'file:./logistics.db',
  apiKey: process.env.API_KEY || '',
  jwtSecret: process.env.JWT_SECRET || '',
} as const;

export const isProduction = config.nodeEnv === 'production';
export const isDevelopment = config.nodeEnv === 'development';
export const isTest = config.nodeEnv === 'test';
