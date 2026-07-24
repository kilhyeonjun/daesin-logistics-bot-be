import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const publicRuntimeFiles = [
  'prisma/schema.prisma',
  'src/domain/entities/Route.ts',
  'src/application/dto/RouteDto.ts',
  'src/infrastructure/crawling/CheerioHttpCrawler.ts',
  'src/infrastructure/persistence/PrismaRouteRepository.ts',
];

describe('public portfolio boundary', () => {
  it('credential-bearing tracking URL feature is absent end-to-end', () => {
    for (const path of publicRuntimeFiles) {
      expect(readFileSync(path, 'utf8'), path).not.toMatch(/trackingUrl|TRACKING_API_KEY|TRACKING_BASE/);
    }

    expect(readFileSync('docs/DESIGN_SPEC.md', 'utf8')).not.toMatch(/custom\.ds3211\.co\.kr\/vcSvl\?apiKey=/);
  });
});
