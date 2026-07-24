import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('repair-created-at.sh', () => {
  it('백업 후 literal created_at만 ISO로 정리하며 재실행해도 값이 유지된다', () => {
    const dir = mkdtempSync(join(tmpdir(), 'created-at-repair-'));
    const database = join(dir, 'logistics.db');
    const literal = "datetime('now', 'localtime')";
    execFileSync('sqlite3', [database], {
      input: `
        CREATE TABLE routes (id INTEGER PRIMARY KEY, created_at TEXT);
        CREATE TABLE migration_jobs (id INTEGER PRIMARY KEY, created_at TEXT);
        CREATE TABLE admins (id INTEGER PRIMARY KEY, created_at TEXT);
        INSERT INTO routes VALUES (1, '${literal.replaceAll("'", "''")}');
        INSERT INTO migration_jobs VALUES (1, '${literal.replaceAll("'", "''")}');
        INSERT INTO admins VALUES (1, '2024-01-01T00:00:00.000Z');
      `,
    });

    expect(() => execFileSync('bash', ['scripts/repair-created-at.sh', database])).toThrow();
    expect(readdirSync(dir).filter((name) => name.startsWith('logistics.db.backup-'))).toHaveLength(0);

    execFileSync('bash', ['scripts/repair-created-at.sh', database, '--services-stopped']);
    const firstValue = execFileSync('sqlite3', [database, 'SELECT created_at FROM routes WHERE id = 1;'], {
      encoding: 'utf8',
    }).trim();
    const untouchedValue = execFileSync('sqlite3', [database, 'SELECT created_at FROM admins WHERE id = 1;'], {
      encoding: 'utf8',
    }).trim();

    expect(firstValue).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(untouchedValue).toBe('2024-01-01T00:00:00.000Z');
    const [backupName] = readdirSync(dir).filter((name) => name.startsWith('logistics.db.backup-'));

    copyFileSync(join(dir, backupName), database);
    const rolledBackValue = execFileSync('sqlite3', [database, 'SELECT created_at FROM routes WHERE id = 1;'], {
      encoding: 'utf8',
    }).trim();
    expect(rolledBackValue).toBe(literal);

    execFileSync('bash', ['scripts/repair-created-at.sh', database, '--services-stopped']);
    const secondValue = execFileSync('sqlite3', [database, 'SELECT created_at FROM routes WHERE id = 1;'], {
      encoding: 'utf8',
    }).trim();

    execFileSync('bash', ['scripts/repair-created-at.sh', database, '--services-stopped']);
    const idempotentValue = execFileSync('sqlite3', [database, 'SELECT created_at FROM routes WHERE id = 1;'], {
      encoding: 'utf8',
    }).trim();

    expect(secondValue).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(idempotentValue).toBe(secondValue);
    expect(readdirSync(dir).filter((name) => name.startsWith('logistics.db.backup-'))).toHaveLength(3);
  });

  it('무결성 검사가 실패하면 백업이나 변경을 만들지 않는다', () => {
    const dir = mkdtempSync(join(tmpdir(), 'created-at-corrupt-'));
    const database = join(dir, 'logistics.db');
    writeFileSync(database, 'not a sqlite database');

    expect(() =>
      execFileSync('bash', ['scripts/repair-created-at.sh', database, '--services-stopped'])
    ).toThrow();
    expect(readdirSync(dir)).toEqual(['logistics.db']);
  });
});
