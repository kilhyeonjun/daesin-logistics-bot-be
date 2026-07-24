import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateEnvironment } from '../src/config/environment.js';

describe('validateEnvironment', () => {
  it('production에서 API_KEY가 없으면 시작을 거부한다', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'production' })).toThrow(
      'API_KEY is required in production'
    );
  });

  it('production에서 JWT_SECRET이 없으면 시작을 거부한다', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'production', API_KEY: 'configured' })).toThrow(
      'JWT_SECRET is required in production'
    );
  });

  it('test에서는 API_KEY와 JWT_SECRET 없이 시작할 수 있다', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'test' })).not.toThrow();
  });

  it('production app와 scheduler 컨테이너에 JWT_SECRET을 전달한다', () => {
    const compose = readFileSync('docker-compose.yml', 'utf8');
    expect(compose.match(/- JWT_SECRET=\$\{JWT_SECRET\}/g)).toHaveLength(2);
  });
});
