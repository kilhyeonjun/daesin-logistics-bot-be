import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfigFromFile } from '@prisma/config';
import { expect, it } from 'vitest';

it('resolves configured paths relative to the config file, not the working directory', async () => {
  const root = await mkdtemp(join(tmpdir(), 'prisma-config-compat-'));
  const directory = join(root, 'config');
  const configFile = join(directory, 'prisma.config.ts');
  const configModule = createRequire(import.meta.url).resolve('@prisma/config');
  try {
    await mkdir(directory);
    await writeFile(configFile, `
      import { defineConfig } from ${JSON.stringify(configModule)};
      export default defineConfig({
        experimental: { externalTables: true },
        schema: '../schema.prisma',
        migrations: {
          path: '../migrations',
          seed: 'node synthetic-seed.js',
          initShadowDb: 'CREATE TABLE synthetic_shadow (id INTEGER);'
        },
        views: { path: '../views' },
        typedSql: { path: '../sql' }
      });\n`);

    const result = await loadConfigFromFile({ configRoot: root, configFile });

    expect(result.error).toBeUndefined();
    expect(result.resolvedPath).toBe(configFile);
    expect(result.config?.loadedFromFile).toBe(configFile);
    expect(result.config?.schema).toBe(join(root, 'schema.prisma'));
    expect(result.config?.migrations).toEqual({
      path: join(root, 'migrations'), seed: 'node synthetic-seed.js',
      initShadowDb: 'CREATE TABLE synthetic_shadow (id INTEGER);',
    });
    expect(result.config?.views).toEqual({ path: join(root, 'views') });
    expect(result.config?.typedSql).toEqual({ path: join(root, 'sql') });

    await rm(configFile);
    const absent = await loadConfigFromFile({ configRoot: directory });
    expect(absent.error).toBeUndefined();
    expect(absent.resolvedPath).toBeNull();
    expect(absent.config?.loadedFromFile).toBeNull();
    expect(absent.config?.schema).toBeUndefined();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
