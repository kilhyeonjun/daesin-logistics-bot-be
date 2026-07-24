import { describe, expect, it } from 'vitest';
import { getApiKeyAuthStatus } from '../src/shared/middleware/apiKeyAuth.js';

describe('apiKeyAuth', () => {
  it('fails closed when the server API key is not configured', () => {
    expect(getApiKeyAuthStatus('', undefined)).toBe(503);
  });

  it('accepts only the configured API key', () => {
    expect(getApiKeyAuthStatus('configured', 'wrong')).toBe(401);
    expect(getApiKeyAuthStatus('configured', 'configured')).toBeNull();
  });
});
